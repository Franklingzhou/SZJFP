CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_no" varchar(50) NOT NULL,
	"student_id" uuid,
	"course_id" uuid,
	"certificate_type" varchar(50),
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"status" varchar(20) DEFAULT 'issued',
	"file_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "certificates_certificate_no_unique" UNIQUE("certificate_no")
);
--> statement-breakpoint
CREATE TABLE "commission_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"user_id" uuid,
	"type" varchar(50),
	"order_id" uuid,
	"enrollment_id" uuid,
	"order_amount" numeric(10, 2),
	"commission_amount" numeric(10, 2),
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50),
	"rule_config" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50),
	"content" text,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_no" varchar(50) NOT NULL,
	"template_id" uuid,
	"type" varchar(50),
	"party_a_name" varchar(200),
	"party_a_phone" varchar(20),
	"party_b_name" varchar(200),
	"party_b_phone" varchar(20),
	"content" jsonb,
	"attachments" text[],
	"status" varchar(20) DEFAULT 'draft',
	"signed_at" timestamp,
	"order_id" uuid,
	"student_id" uuid,
	"lead_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contracts_contract_no_unique" UNIQUE("contract_no")
);
--> statement-breakpoint
CREATE TABLE "course_package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid,
	"course_id" uuid,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "course_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"validity_days" integer,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" varchar(200),
	"teacher_id" uuid,
	"max_students" integer,
	"enrolled_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'scheduled',
	"review_status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_no" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"teacher_id" uuid,
	"type" varchar(50),
	"duration" integer,
	"price" numeric(10, 2),
	"max_students" integer,
	"min_students" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft',
	"review_status" varchar(20) DEFAULT 'pending',
	"location" varchar(200),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "courses_course_no_unique" UNIQUE("course_no")
);
--> statement-breakpoint
CREATE TABLE "customer_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"user_id" uuid,
	"type" varchar(50),
	"content" text,
	"next_followup_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gender" varchar(10),
	"address" varchar(500),
	"address_lat" numeric(10, 8),
	"address_lng" numeric(11, 8),
	"level" varchar(20) DEFAULT 'normal',
	"source" varchar(50),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"course_schedule_id" uuid,
	"package_id" uuid,
	"original_price" numeric(10, 2),
	"actual_price" numeric(10, 2),
	"paid" numeric(10, 2) DEFAULT 0,
	"status" varchar(20) DEFAULT 'enrolled',
	"enrollment_date" timestamp,
	"attendance_records" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid,
	"score" numeric(5, 2),
	"exam_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"user_id" uuid,
	"content" text,
	"next_followup_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_no" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gender" varchar(10),
	"intent_level" varchar(10) DEFAULT 'B',
	"interest_type" varchar(50),
	"budget" numeric(10, 2),
	"source" varchar(50),
	"assigned_to" uuid,
	"is_public" boolean DEFAULT false,
	"last_contact_at" timestamp,
	"no_contact_days" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'new',
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leads_lead_no_unique" UNIQUE("lead_no")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" varchar(200) NOT NULL,
	"content" text,
	"type" varchar(50),
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"worker_id" uuid,
	"status" varchar(20) DEFAULT 'pending',
	"responded_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"customer_id" uuid,
	"worker_id" uuid,
	"service_type" varchar(50) NOT NULL,
	"service_content" text,
	"service_address" varchar(500),
	"service_start_time" timestamp,
	"service_end_time" timestamp,
	"service_duration" integer,
	"original_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"deposit_paid" numeric(10, 2) DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending',
	"matching_type" varchar(20),
	"signed_at" timestamp,
	"sign_confirmed" boolean DEFAULT false,
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "platform_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"fee_rate" numeric(5, 4),
	"fixed_fee" numeric(10, 2),
	"min_fee" numeric(10, 2),
	"max_fee" numeric(10, 2),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resume_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid,
	"status" varchar(20) DEFAULT 'pending',
	"notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"worker_id" uuid,
	"customer_id" uuid,
	"rating" integer,
	"content" text,
	"tags" text[],
	"reply" text,
	"replied_at" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"description" varchar(200),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_no" varchar(50) NOT NULL,
	"user_id" uuid,
	"type" varchar(50),
	"total_orders" integer DEFAULT 0,
	"total_amount" numeric(10, 2),
	"commission_amount" numeric(10, 2),
	"actual_amount" numeric(10, 2),
	"status" varchar(20) DEFAULT 'pending',
	"paid_at" timestamp,
	"bank_name" varchar(100),
	"bank_account" varchar(50),
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settlements_settlement_no_unique" UNIQUE("settlement_no")
);
--> statement-breakpoint
CREATE TABLE "sms_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code" varchar(6) NOT NULL,
	"type" varchar(20) DEFAULT 'login',
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"student_no" varchar(50),
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"gender" varchar(10),
	"age" integer,
	"id_card" varchar(18),
	"source" varchar(50),
	"recruiter_id" uuid,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "students_student_no_unique" UNIQUE("student_no")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"user_id" uuid,
	"role" varchar(50) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"leader_id" uuid,
	"parent_id" uuid,
	"member_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20),
	"password" varchar(255),
	"role" varchar(50) DEFAULT 'worker' NOT NULL,
	"name" varchar(100),
	"avatar" varchar(500),
	"status" varchar(20) DEFAULT 'active',
	"credit_score" integer DEFAULT 100,
	"points" integer DEFAULT 0,
	"deposit" numeric(10, 2) DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wechat_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"openid" varchar(100),
	"unionid" varchar(100),
	"session_key" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "wechat_users_openid_unique" UNIQUE("openid")
);
--> statement-breakpoint
CREATE TABLE "worker_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"id_card" varchar(18),
	"service_types" text[],
	"experience" integer,
	"introduction" text,
	"status" varchar(20) DEFAULT 'pending',
	"notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"worker_no" varchar(50),
	"name" varchar(100) NOT NULL,
	"gender" varchar(10),
	"age" integer,
	"id_card" varchar(18),
	"id_card_front" varchar(500),
	"id_card_back" varchar(500),
	"service_types" text[],
	"service_area" varchar(200),
	"experience" integer,
	"salary_expectation" numeric(10, 2),
	"resume" varchar(500),
	"skills" text[],
	"certificates" text[],
	"introduction" text,
	"photos" text[],
	"status" varchar(20) DEFAULT 'pending',
	"work_status" varchar(20) DEFAULT 'available',
	"review_status" varchar(20) DEFAULT 'pending',
	"review_notes" text,
	"reviewed_at" timestamp,
	"reviewed_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workers_worker_no_unique" UNIQUE("worker_no")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_rule_id_commission_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commission_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_package_items" ADD CONSTRAINT "course_package_items_package_id_course_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."course_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_package_items" ADD CONSTRAINT "course_package_items_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_followups" ADD CONSTRAINT "customer_followups_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_followups" ADD CONSTRAINT "customer_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_schedule_id_course_schedules_id_fk" FOREIGN KEY ("course_schedule_id") REFERENCES "public"."course_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_package_id_course_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."course_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_followups" ADD CONSTRAINT "lead_followups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_followups" ADD CONSTRAINT "lead_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_recommendations" ADD CONSTRAINT "order_recommendations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_recommendations" ADD CONSTRAINT "order_recommendations_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_reviews" ADD CONSTRAINT "resume_reviews_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_reviews" ADD CONSTRAINT "resume_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_id_teams_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wechat_users" ADD CONSTRAINT "wechat_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_applications" ADD CONSTRAINT "worker_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;