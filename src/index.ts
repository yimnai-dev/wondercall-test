import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { prisma } from './prisma-client'
import { addCommentBodySchema, createMessageBodySchema, likeMessageSchema, signInSchema } from './schema'
import { decode, sign, verify } from 'hono/jwt'
import bcrypt from 'bcrypt'

const SECRET_KEY = '7c082e19-002f-48a3-a2a7-6b00b8c1d04b'

const app = new Hono()

app.get('/', async (c) => {
  const users = await prisma.user.findMany()
  return c.json({
    users
  })
})

app.post('/users/create', async (c) => {
  try {
    const user = await prisma.user.create({
      data: {}
    })
    return c.json({
      user
    }, 200)
  } catch (error) {
    return c.json({
      error
    }, 500)
  }
})

// Signin
app.post('/signin', async (c) => {
  const body = await c.req.json()
  const parsedBody = signInSchema.safeParse(body)
  if(!parsedBody.success) {
    return c.json({
      error: parsedBody.error.message
    }, 400)
  }
  const { email, password  } = parsedBody.data
  const user = await prisma.user.findFirst({
    where: {
      email
    }
  })
  if(!user) {
    return c.json({
      error: 'No user with that email exists'
    })
  }
  const passwordsMatch = await bcrypt.compare(password, user.password)
  if(!passwordsMatch) {
    return c.json({
      error: 'Wrong password'
    })
  }
  const payload = {
    user: {
      id: user.id,
      email: user.email
    },
    exp: Math.floor(Date.now() / 1000) + 60 * 5
  }
  const token = await sign(payload, SECRET_KEY)
  return c.json({
    token
  }, 200)
})

app.get('/users/all', async (c) => {
  const users = await prisma.user.findMany()
  return c.json({
    users
  })
})

app.post('/message', async (c) => {
  const body = await c.req.json()
  const parsedBody = createMessageBodySchema.safeParse(body)
  if (!parsedBody.success) {
    return c.json({
      error: parsedBody.error.message
    }, 400)
  }

  try {
    const msg = await prisma.message.create({
      data: {
        message: parsedBody.data.message,
        userId: parsedBody.data.userId
      },
    })
    return c.json({
      id: msg.id,
      message: 'Message created successfully',
    }, 201)
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Sorry, an unknown error occured'
    return c.json({
      error: errorMessage
    })
  }
})

app.get('/message/:id', async (c) => {
  const id = c.req.param('id')
  if (!id || Number.isNaN(id)) {
    return c.json({
      error: 'A message ID is required'
    }, 400)
  }
  try {
    const msg = await prisma.message.findFirst({
      where: {
        id: Number.parseInt(id)
      },
    })
    if (!msg) {
      return c.json({
        error: 'No message with that ID exists'
      }, 404)
    }
    return c.json({
      posterId: msg.userId,
      likeCount: msg.likeCount,
      messageId: msg.id,
      content: msg.message,
      timestamp: msg.timestamp
    })
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Sorry, an error occured and we could not process your request'
    return c.json({
      error: errorMessage
    }, 500)
  }
})

app.get('/message/all', async (c) => {
  try {
    const messages = await prisma.message.findMany()
    return c.json({
      messages
    }, 200)
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Sorry, an error occured and we could not process your request'
    return c.json({
      error: errorMessage
    }, 500)
  }
})

app.put('/message/like', async (c) => {
  const body = await c.req.json()
  const parsedBody = likeMessageSchema.safeParse(body)
  if(!parsedBody.success) {
    return c.json({
      error: parsedBody.error.message
    })
  }
  const { messageId, userId } = parsedBody.data
  if (!messageId || !userId || Number.isNaN(messageId)) {
    return c.json({
      error: 'User ID and message iD are required'
    }, 400)
  }
  try {
    const msgExists = await prisma.message.findFirst({
      where: {
        id: messageId
      }
    })
    if (!msgExists) {
      return c.json({
        error: 'The message you are trying to like does not exists'
      })
    }
    const userLikedMsgAlready = await prisma.like.findFirst({
      where: {
        userId,
        messageId: messageId
      }
    })
    if (userLikedMsgAlready) {
      return c.json({
        message: 'You have liked the content of this message already'
      }, 200)
    }
    const likeMessage = await prisma.message.update({
      data: {
        likeCount: msgExists.likeCount + 1,
        likes: {
          create: {
            userId,
          }
        }
      },
      where: {
        id: messageId,
      }
    })
    return c.json({
      message: 'Message Liked successfully',
      messageId: likeMessage.id
    }, 201)
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Sorry, an error occured and we could not process your request'
    return c.json({
      error: errorMessage
    }, 500)
  }
})

app.post('/message/:id/comment/:userId', async (c) => {
  const body = await c.req.json()
  const { id, userId } = c.req.param()
  if (!id || !userId || Number.isNaN(id)) {
    return c.json({
      error: 'Invalid request parameters'
    })
  }
  const parsedBody = addCommentBodySchema.safeParse(body)
  if (!parsedBody.success) {
    return c.json({
      error: parsedBody.error.message
    }, 400)
  }
  const comment = await prisma.comment.create({
    data: {
      content: parsedBody.data.comment,
      userId: userId,
      messageId: Number.parseInt(id)
    }
  })
  return c.json({
    message: 'Commented Successfully!',
    comment,
  }, 200)
})

app.get('/message/:id/comments', async (c) => {
  const { id } = c.req.param()
  if (!id || Number.isNaN(id)) {
    return c.json({
      error: 'Invalid ID'
    })
  }
  try {
    const comments = await prisma.comment.findMany({
      where: {
        messageId: Number.parseInt(id)
      }
    })
    return c.json({
      messageId: id,
      comments
    })
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Sorry, an error occured and we could not process your request'
    return c.json({
      error: errorMessage
    }, 500)
  }
})


const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
