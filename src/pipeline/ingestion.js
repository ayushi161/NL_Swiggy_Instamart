let baselineData = [];

export async function loadBaseline() {
  try {
    const urls = [
      './data/raw_playstore_main.json',
      './data/raw_playstore_instamart.json',
      './data/raw_appstore_main.json',
      './data/raw_appstore_instamart.json',
      './data/raw_reddit.json'
    ];
    
    const responses = await Promise.all(
      urls.map(url => fetch(url).catch(e => {
        console.warn(`Failed to fetch ${url}`, e);
        return null;
      }))
    );
    
    let allRecords = [];
    for (const response of responses) {
      if (response && response.ok) {
        const records = await response.json();
        allRecords = allRecords.concat(records);
      }
    }

    // Deduplicate by review_id
    const uniqueRecords = [];
    const seenIds = new Set();
    for (const r of allRecords) {
      if (r.review_id && !seenIds.has(r.review_id)) {
        uniqueRecords.push(r);
        seenIds.add(r.review_id);
      } else if (!r.review_id) {
        uniqueRecords.push(r);
      }
    }
    
    let records = uniqueRecords;

    if (records.length > 5000) {
      console.warn("Baseline exceeds 5000 records. Truncating.");
      records = records.slice(0, 5000);
    }
    
    if (records.length < 20) {
      throw new Error(`Insufficient samples: ${records.length} found, 20 required.`);
    }
    
    baselineData = records;
    return records;
  } catch (error) {
    throw new Error(`Failed to load baseline: ${error.message}`);
  }
}

export function parseUpload(fileContent, fileType) {
  let uploadedRecords = [];
  
  if (fileType === 'application/json' || fileType === 'json') {
    uploadedRecords = JSON.parse(fileContent);
  } else if (fileType === 'text/csv' || fileType === 'csv') {
    // Lightweight CSV parser
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        // Handle basic quoted CSV fields
        const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
        let match;
        const values = [];
        while ((match = regex.exec(lines[i])) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          values.push(match[1] !== undefined ? match[1] : match[2]);
        }
        
        const record = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx];
        });
        uploadedRecords.push(record);
      }
    }
  } else {
    throw new Error("Unsupported file type");
  }

  // Schema normalization
  uploadedRecords = uploadedRecords.map(record => {
    if (!record.review_id) {
      // Basic hash simulation if missing
      const strToHash = (record.source_channel || '') + (record.raw_text || '') + (record.timestamp || '');
      // Simplistic hash for browser without crypto API
      let hash = 0;
      for (let i = 0; i < strToHash.length; i++) {
        const char = strToHash.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      record.review_id = Math.abs(hash).toString(16);
    }
    record.scrubbed_text = "";
    record.assigned_cluster = -1;
    if (record.rating) record.rating = parseInt(record.rating, 10);
    return record;
  });

  // Merge strategy
  const merged = [...baselineData];
  const existingIds = new Set(merged.map(r => r.review_id));
  
  uploadedRecords.forEach(r => {
    if (!existingIds.has(r.review_id)) {
      merged.push(r);
      existingIds.add(r.review_id);
    }
  });

  if (merged.length > 5000) {
    console.warn("Merged records exceed 5000. Truncating.");
    return merged.slice(0, 5000);
  }
  return merged;
}
