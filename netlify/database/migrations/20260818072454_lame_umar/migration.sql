CREATE TABLE "projects" (
	"id" text PRIMARY KEY,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar_followups" (
	"project_id" text PRIMARY KEY,
	"project_title" text NOT NULL,
	"speaker" text,
	"date" text,
	"last_ping" timestamp with time zone,
	"ping_count" integer DEFAULT 0 NOT NULL
);
