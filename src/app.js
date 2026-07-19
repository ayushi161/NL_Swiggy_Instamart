import { loadBaseline, parseUpload } from './pipeline/ingestion.js';
import { normalize } from './pipeline/normalization.js';
import { scrub } from './pipeline/piiScrubber.js';
import { buildFrequencyMatrix, classifyAll } from './pipeline/clustering.js';
import { rankThemes } from './pipeline/ranking.js';
import { verifyQuotes } from './pipeline/quoteTrust.js';
import { handleAllNoise } from './edgeCases/allNoise.js';
import { handleMonolith } from './edgeCases/monolith.js';
import { callLLM } from './llm/apiClient.js';
import { renderMetrics } from './ui/metricsBar.js';
import { renderMatrix } from './ui/frictionMatrix.js';
import { renderDeepDive } from './ui/categoryDeepDive.js';
import { renderBlueprint } from './ui/experimentBlueprint.js';

let pipelineState = 'IDLE';

async function advancePipeline(nextState) {
  console.log(`Transitioning: ${pipelineState} -> ${nextState}`);
  pipelineState = nextState;
  onStateChange(pipelineState);
}

function onStateChange(state) {
  // Update UI progress indicator
  console.log(`State change: ${state}`);
}

function renderError(message) {
  console.error(message);
}

export async function runPipeline() {
  try {
    await advancePipeline('INGESTING');
    const raw = await loadBaseline();
    
    await advancePipeline('NORMALIZING');
    const clean = normalize(raw);
    if (clean.length < 20) throw new Error(`Insufficient samples: ${clean.length}`);
    
    await advancePipeline('PII_SCRUB');
    const scrubbed = scrub(clean);
    
    await advancePipeline('MAP_REDUCE_TAXONOMY');
    const matrix = buildFrequencyMatrix(scrubbed);
    // TODO: implement callLLM inside discoverTaxonomy
    const taxonomy = []; 
    const classified = classifyAll(scrubbed, taxonomy);
    
    // Edge-case checks
    const allNoise = classified.length > 0 && classified.every(r => r.assigned_cluster === -1);
    const processed = allNoise ? handleAllNoise(classified) : classified;
    
    await advancePipeline('RANKING');
    let themes = rankThemes(processed, taxonomy);
    themes = handleMonolith(themes, processed);
    
    await advancePipeline('EVIDENCE_EXTRACTION');
    const enriched = themes; 
    const verified = verifyQuotes(enriched, scrubbed);
    
    await advancePipeline('RENDERING');
    renderMetrics({ total: raw.length, clean: clean.length, themes: verified.length });
    renderMatrix(verified);
    renderDeepDive(verified);
    renderBlueprint(verified);
    
    await advancePipeline('IDLE');
  } catch (error) {
    await advancePipeline('ERROR_STATE');
    renderError(error.message);
  }
}

window.runPipeline = runPipeline;
