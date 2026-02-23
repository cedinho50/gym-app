import { z } from "zod";
import { insertExerciseSchema, insertWorkoutSplitSchema, insertWorkoutHistorySchema, exercises, workoutSplits, workoutHistory } from "./schema";

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
  splits: {
    list: {
      method: "GET" as const,
      path: "/api/splits" as const,
      responses: {
        200: z.array(z.custom<typeof workoutSplits.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/splits" as const,
      input: insertWorkoutSplitSchema,
      responses: {
        201: z.custom<typeof workoutSplits.$inferSelect>(),
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/splits/:id" as const,
      input: insertWorkoutSplitSchema.partial(),
      responses: {
        200: z.custom<typeof workoutSplits.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/splits/:id" as const,
      responses: {
        204: z.void(),
      },
    },
  },
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
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/exercises/:id" as const,
      input: insertExerciseSchema.partial(),
      responses: {
        200: z.custom<typeof exercises.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/exercises/:id" as const,
      responses: {
        204: z.void(),
      },
    },
  },
  history: {
    list: {
      method: "GET" as const,
      path: "/api/history" as const,
      responses: {
        200: z.array(z.custom<typeof workoutHistory.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/history" as const,
      input: insertWorkoutHistorySchema,
      responses: {
        201: z.custom<typeof workoutHistory.$inferSelect>(),
      },
    },
  },
  workout: {
    finish: {
      method: "POST" as const,
      path: "/api/workout/finish" as const,
      input: z.object({ splitId: z.number() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
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
