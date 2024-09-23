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

export const testController = new Hono();
testController.get("/", async (c) => {
  const fakedata: faketype[] = Array.from({ length: 1000 }, (_, index) => ({
      id: index,
      name: faker.person.fullName(),
      age: faker.number.int({ min: 1, max: 100 }),
    posts: [{
          id: index,
          title: faker.lorem.sentence(),
          body: faker.lorem.paragraphs(),
    }],
  }));
  return c.json(fakedata);
});
testController.get("/hello", (c) => {
  const name = c.req.query("name") || "World";
  return c.text(`hello ${name}`);
});
