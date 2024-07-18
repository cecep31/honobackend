import { Hono } from "hono"

const fakedata = [
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    { id: 1, name: "tag1",
        posts: [
            { id: 1, title: "post1", content: "content1" },
            { id: 2, title: "post2", content: "content2" },
            { id: 3, title: "post3", content: "content3" },
        ]
     },
    
]

export const testController = new Hono()
    .get("/", async (c) => {
        return c.json(fakedata)
    })
