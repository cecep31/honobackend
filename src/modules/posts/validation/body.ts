import { z } from "zod";
import sanitizeHtml from "sanitize-html";

/** Max length for WYSIWYG/HTML body (tags add ~30–50% overhead vs plain text). */
const BODY_MAX_LENGTH = 500_000;

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "u",
    "s",
    "sub",
    "sup",
    "mark",
    "hr",
    "code",
    "pre",
    "iframe", // Allow iframes for YouTube/Video embeds
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "data-*"], // Allow data attributes for TipTap extensions
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "frameborder",
      "allow",
      "allowfullscreen",
    ],
  },
  allowedStyles: {
    "*": {
      "color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/],
      "background-color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/],
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      "font-size": [/^\d+(?:px|em|rem|%)$/],
      "padding-left": [/^\d+(?:px|em|rem|%)$/], // Useful for task lists/indentation
    },
  },
  allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"], // Security: restrict where iframes can come from
};

export const createPostSchema = z.object({
  title: z.string().min(5).max(255),
  body: z
    .string()
    .min(20)
    .max(BODY_MAX_LENGTH)
    .transform((val) => sanitizeHtml(val, sanitizeOptions)),
  slug: z.string().min(5).max(255),
  tags: z.array(z.string()).optional().default([]),
  photo_url: z.string().optional().nullable(),
  published: z.boolean().optional().default(true),
});

export const updatePostSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  body: z
    .string()
    .min(20)
    .max(BODY_MAX_LENGTH)
    .optional()
    .transform((val) => (val ? sanitizeHtml(val, sanitizeOptions) : val)),
  slug: z.string().min(5).max(255).optional(),
  tags: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
  published: z.boolean().optional(),
});

export type PostCreateBody = z.infer<typeof createPostSchema>;
