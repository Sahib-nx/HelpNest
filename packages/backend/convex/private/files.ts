import { ConvexError, v } from "convex/values";
import { contentHashFromArrayBuffer, guessMimeTypeFromContents, guessMimeTypeFromExtension, RAG, vEntryId } from "@convex-dev/rag"
import { action, mutation } from "../_generated/server";
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { Id } from "../_generated/dataModel";

function guessMineType(filename: string, bytes: ArrayBuffer): string {
    return (
        guessMimeTypeFromExtension(filename) ||
        guessMimeTypeFromContents(bytes) ||
        "application/octet-stream"
    );
};

export const deleteFile = mutation({
    args: {
        entryId: vEntryId,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found!"
            });
        };

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found!"
            });
        };

        const namespace = await rag.getNamespace(ctx, {
            namespace: orgId
        });

        if (!namespace) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Invalid namespace"
            });
        };

        const enrty = await rag.getEntry(ctx, {
            entryId: args.entryId
        });

        if (!enrty) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Entry not found!"
            });
        };

        if (enrty.metadata?.uploadedBy !== orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Invalid organization ID!"
            });
        };

        if(enrty.metadata?.storageId) {
            await ctx.storage.delete(enrty.metadata.storageId as Id<"_storage">)
        };

        await rag.deleteAsync(ctx, {
            entryId: args.entryId
        });
    },
});

export const addFile = action({
    args: {
        filename: v.string(),
        mineType: v.string(),
        bytes: v.bytes(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found!"
            });
        };

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found!"
            });
        };

        const { bytes, filename, category } = args;

        const mineType = args.mineType || guessMineType(filename, bytes);
        const blob = new Blob([bytes], { type: mineType });

        const storageId = await ctx.storage.store(blob);

        const text = await extractTextContent(ctx, {
            storageId,
            filename,
            bytes,
            mineType
        });

        const { entryId, created } = await rag.add(ctx, {
            // super inportant: what search space to add this. You cannot search across namespaces
            //if not add it will be considered global (i do not want this)
            namespace: orgId,
            text,
            key: filename,
            title: filename,
            metadata: {
                storageId, //important for deletion of file 
                uploadedBy: orgId,
                filename,
                category: category ?? null,
            },
            contentHash: await contentHashFromArrayBuffer(bytes) // to avoid re-inserting if the file has not chnaged
        });

        if (!created) {
            console.debug("entry already exists, skipping upload metadata");
            await ctx.storage.delete(storageId);
        }

        return {
            url: await ctx.storage.getUrl(storageId),
            entryId,
        };
    },
});