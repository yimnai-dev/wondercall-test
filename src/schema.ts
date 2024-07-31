import {z} from 'zod'

export const createMessageBodySchema = z.object({
    userId: z.string().uuid(),
    message: z.string().trim().min(1)
})

export const addCommentBodySchema = z.object({
    comment: z.string().trim().min(1),
})

export const likeMessageSchema = z.object({
    messageId: z.coerce.number(),
    userId: z.string().trim().uuid(),
})