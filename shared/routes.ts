import { z } from "zod";
import { insertExerciseSchema, exercises } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
};

export const api = {
  exercises: {
    list: {
      method: "GET" as const,
      path: "/api/exercises" as const,
      responses: {
        200: z.array(z.custom<typeof exercises.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/exercises" as const,
      input: insertExerciseSchema,
      responses: {
        201: z.custom<typeof exercises.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/exercises/:id" as const,
      input: insertExerciseSchema.partial(),
      responses: {
        200: z.custom<typeof exercises.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/exercises/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    resetCompleted: {
      method: "POST" as const,
      path: "/api/exercises/reset" as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ExerciseInput = z.infer<typeof api.exercises.create.input>;
export type ExerciseUpdateInput = z.infer<typeof api.exercises.update.input>;
export type ExerciseResponse = z.infer<typeof api.exercises.create.responses[201]>;
export type ExercisesListResponse = z.infer<typeof api.exercises.list.responses[200]>;
