import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        const res = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: query }),
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: err }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({
            answer: data.answer,
            graph_data: data.graph_data || [],
            sources: data.sources || [],
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
