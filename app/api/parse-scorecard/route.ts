import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface ParsedHole {
  hole: number;
  par: number;
  score: number;
}

export interface ParseScorecardResponse {
  scores: ParsedHole[];
  playerName?: string;
  totalScore?: number;
  confidence?: "high" | "medium" | "low";
}

const PROMPT = `이 이미지는 골프존 스크린골프 또는 일반 골프 스코어카드입니다.
홀별 타수를 JSON 형식으로 추출해주세요.

반드시 아래 형식으로만 응답하세요 (JSON 외 텍스트 없이):
{
  "scores": [
    {"hole": 1, "par": 4, "score": 5},
    {"hole": 2, "par": 3, "score": 3},
    ...
  ],
  "playerName": "이름 (파악 가능한 경우만)",
  "totalScore": 85,
  "confidence": "high"
}

규칙:
- hole: 홀 번호 1~18
- par: 해당 홀의 파 (3, 4, 5 중 하나). 표기가 없으면 기본 레이아웃 사용 (파3×4, 파4×10, 파5×4, 합계 72)
- score: 실제 타수 (숫자). 파악 불가 시 par 값으로 대체
- confidence: 이미지 판독 신뢰도 (high/medium/low)
- 18홀 전체를 반드시 포함
- playerName, totalScore는 파악 불가 시 생략`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일에 ANTHROPIC_API_KEY를 추가해주세요." },
      { status: 500 }
    );
  }

  let body: { image: string; mediaType: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { image, mediaType } = body;
  if (!image || !mediaType) {
    return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다. (JPG/PNG/GIF/WEBP만 가능)" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: image,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // JSON 블록 추출 (마크다운 코드펜스 포함 대응)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw;

    let parsed: ParseScorecardResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "스코어카드를 인식하지 못했습니다. 더 선명한 이미지를 사용해주세요." },
        { status: 422 }
      );
    }

    // 최소 유효성 검사
    if (!Array.isArray(parsed.scores) || parsed.scores.length === 0) {
      return NextResponse.json(
        { error: "홀 스코어를 찾을 수 없습니다. 스코어카드가 포함된 이미지인지 확인해주세요." },
        { status: 422 }
      );
    }

    // 18홀 보장 — 누락된 홀은 par 값으로 채움
    const DEFAULT_PARS = [4,3,5,4,4,3,5,4,4, 4,3,5,4,4,3,5,4,4];
    const scoreMap = new Map(parsed.scores.map((s) => [s.hole, s]));
    const fullScores: ParsedHole[] = Array.from({ length: 18 }, (_, i) => {
      const hole = i + 1;
      const existing = scoreMap.get(hole);
      const par = existing?.par ?? DEFAULT_PARS[i];
      return { hole, par, score: existing?.score ?? par };
    });

    return NextResponse.json({
      scores: fullScores,
      playerName: parsed.playerName,
      totalScore: parsed.totalScore ?? fullScores.reduce((s, h) => s + h.score, 0),
      confidence: parsed.confidence ?? "medium",
    } satisfies ParseScorecardResponse);
  } catch (err) {
    console.error("[parse-scorecard]", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `분석 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
