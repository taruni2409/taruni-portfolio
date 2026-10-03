import { NextRequest } from "next/server";
import { streamPumpkinReply, type PumpkinChatMessage } from "@/lib/pumpkinGemini";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type ChatRequestBody = {
  messages?: PumpkinChatMessage[];
  message: string;
};

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body?.message) {
    return new Response("Missing 'message'", { status: 422 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for await (const item of streamPumpkinReply(body.messages ?? [], body.message)) {
          if ("token" in item) {
            send({ token: item.token });
          } else if ("done" in item) {
            send({ done: true, sources: [], model: item.model });
          } else if ("error" in item) {
            send({ error: item.error });
          }
        }
      } catch {
        send({ error: "stream_error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
