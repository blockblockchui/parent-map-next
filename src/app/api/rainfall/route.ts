import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://data.weather.gov.hk/weatherAPI/hko_data/F3/Gridded_rainfall_nowcast_tc.csv',
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch rainfall data' },
        { status: 500 }
      );
    }
    
    const csvText = await response.text();
    
    return new NextResponse(csvText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching rainfall data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rainfall data' },
      { status: 500 }
    );
  }
}
