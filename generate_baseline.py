import json
from datetime import datetime, timedelta
from google_play_scraper import Sort, reviews

# Calculate the 5-month date boundary limit
five_months_ago = datetime.now() - timedelta(days=5*30)
print(f"Floor limit target date: {five_months_ago.date()}")

def scrape_playstore_app(app_id, output_filename, channel_label):
    print(f"Starting extraction for {channel_label} ({app_id})...")
    compiled_data = []
    continuation_token = None
    date_boundary_reached = False

    for page in range(5):  # Pulling up to 5 pages per app to keep runs lightweight
        result, continuation_token = reviews(
            app_id,
            lang='en',
            country='in',
            sort=Sort.NEWEST,
            count=100,
            continuation_token=continuation_token
        )
        
        for r in result:
            review_date = r['at']
            if review_date < five_months_ago:
                date_boundary_reached = True
                break
                
            compiled_data.append({
                "review_id": f"playstore_{r['reviewId'][:12]}",
                "source_channel": channel_label,
                "raw_text": r['content'],
                "rating": r['score'],
                "timestamp": review_date.isoformat(),
                "scrubbed_text": "",
                "assigned_cluster": -1
            })
            
        if date_boundary_reached or not continuation_token:
            break

    output_path = f'data/{output_filename}'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(compiled_data, f, indent=2, ensure_ascii=False)
    print(f"Success! Generated {len(compiled_data)} rows inside {output_path}")

# Run extraction targeting both application architectures explicitly
scrape_playstore_app('in.swiggy.android', 'raw_playstore_main.json', 'PlayStore_Main')
scrape_playstore_app('in.swiggy.android.instamart', 'raw_playstore_instamart.json', 'PlayStore_Instamart')