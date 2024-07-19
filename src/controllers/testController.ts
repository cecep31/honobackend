import { Hono } from "hono";
import { faker } from "@faker-js/faker";

type faketype = {
  id: number;
  name: string;
  age: number;
  posts: [
    {
      id: number;
      title: string;
      body?: string;
    }
  ];
};

export const testController = new Hono().get("/", async (c) => {
  const fakedata: faketype[] = [];

  for (let index = 0; index < 1000; index++) {
    fakedata.push({
      id: index,
      name: faker.person.fullName(),
      age: faker.number.int({ min: 1, max: 100 }),
      posts: [
        {
          id: index,
          title: faker.lorem.sentence(),
          body: faker.lorem.paragraphs(),
        },
      ],
    });
  }
  return c.json(fakedata);
});
