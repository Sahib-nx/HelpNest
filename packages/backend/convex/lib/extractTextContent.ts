import { generateText } from "ai";
import type { StorageActionWriter } from "convex/server";
import { assert } from "convex-helpers";
import { openai } from "@ai-sdk/openai";
import { Id } from "../_generated/dataModel";

const AI_MODELS = {
    image: openai.chat("gpt-4o-mini"),
    pdf: openai.chat("gpt-4o"),
    html: openai.chat("gpt-4o")
} as const;

const SUPPORTING_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

const SYSTEM_PROMPT = {
    image: "You turn images into text, If it is a photo of a document, transcribe it. if it is not a document, describe it.",
    pdf: "You transform PDF files into text.",
    html: "You transform content into markdown."
};

export type ExtractTextContentArgs = {
    storageId: Id<"_storage">;
    filename: string;
    bytes?: ArrayBuffer;
    mineType: string;
};

export async function extractTextContent(
    ctx: { storage: StorageActionWriter },
    args: ExtractTextContentArgs,
): Promise<string> {
    const { storageId, filename, bytes, mineType } = args;

    const url = await ctx.storage.getUrl(storageId);
    assert(url, "Failed to get the storage URL");

    if (SUPPORTING_IMAGE_TYPES.some((type) => type === mineType)) {
        return extractImageText(url);
    };

    if(mineType.toLowerCase().includes("pdf")) {
        return extractPdfText(url, mineType, filename);
    };

    if(mineType.toLowerCase().includes("text")) {
        return extractTextFileContent(ctx, storageId, bytes, mineType)
    };

    throw new Error(`Unsupported MINE types: ${mineType}`);
};

async function extractTextFileContent (
    ctx: { storage: StorageActionWriter },
    storageId: Id<"_storage">,
    bytes: ArrayBuffer | undefined,
    mineType : string
): Promise<string> {
    const arrayBuffer = 
    bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

    if(!arrayBuffer) {
        throw new Error("Failed to get file content!")
    }

    const text = new TextDecoder().decode(arrayBuffer);

    if(mineType.toLowerCase() !== "text/plain") {
        const result = await generateText({
            model: AI_MODELS.html,
            system: SYSTEM_PROMPT.html,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text},
                        {
                            type: "text",
                            text: "Extract the text and print it in a markdown format without explaining that you will do so."
                        },
                    ],
                },
            ],
        });
        return result.text;
    }

    return text;
}

async function extractPdfText(
    url: string,
    mineType: string,
    filename: string,
): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.pdf,
        system: SYSTEM_PROMPT.pdf,
        messages: [
            {
                role: "user",
                content: [
                    { type: "file", data: new URL(url) , mineType, filename },
                    {
                        type: "text",
                        text: "Extract the text from the PDF and print it without explaining you will do so.",
                    }
                ] as any //It will cause some problems i think but lets see..it's just to satisfy tyscript there is a version mismatch error!!
            }
        ]
    });

    return result.text;
};

async function extractImageText(url: string): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.image,
        system: SYSTEM_PROMPT.image,
        messages: [
            {
                role: "user",
                content: [{ type: "image", image: new URL(url) }]
            },
        ],
    });

    return result.text
};


