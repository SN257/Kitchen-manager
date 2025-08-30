import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756549621244 implements MigrationInterface {
    name = 'Migration1756549621244'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "recipe" ("id" SERIAL NOT NULL, "vangiName" character varying NOT NULL, "ingredients" jsonb NOT NULL, "items_per_kg" numeric(10,3) NOT NULL, "center" character varying, "userId" integer, CONSTRAINT "PK_e365a2fedf57238d970e07825ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying, "center" character varying NOT NULL, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "event" ("id" SERIAL NOT NULL, "eventName" character varying NOT NULL, "eventYear" character varying NOT NULL, "description" character varying, "userId" integer NOT NULL, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "weight_entry" ("id" SERIAL NOT NULL, "vangiName" character varying NOT NULL, "gram" double precision NOT NULL, "eventId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_4edb448dd0b23317618f514db49" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "weight_calculation_entry" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "entries" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_93f3fab3a16fb80bf420892df3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vasan_nos_calculation_entry" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "entries" json NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2af682a69aac0a7eb6564a538c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "section_vasan_summary" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "rows" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_41c6380a17060d3180cb15baa04" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vasan" ("id" SERIAL NOT NULL, "vasanName" character varying NOT NULL, "description" character varying(500), "eventId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_ec088f56f81b273959b3fadf010" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sections" ("id" SERIAL NOT NULL, "sectionName" character varying NOT NULL, "description" character varying, "eventId" integer NOT NULL, "userId" integer NOT NULL, "rows" integer NOT NULL, "columns" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "food_item" ("id" SERIAL NOT NULL, "vangiName" character varying NOT NULL, "category" character varying NOT NULL, CONSTRAINT "PK_057940b0225785ec693de562cf4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "section_layout" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "sectionId" integer NOT NULL, "cells" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_023c962598a6fb6f7ec8dde9580" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vasan_fill_plan" ("id" SERIAL NOT NULL, "vasanId" integer NOT NULL, "eventId" integer, "foodName" character varying(200) NOT NULL, "fillWeightKg" double precision NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0fa3b46af3f2a0fbeb2a9985f6c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "box_weight_entry" ("id" SERIAL NOT NULL, "priceRange" character varying NOT NULL, "boxType" character varying NOT NULL, "totalBoxes" integer NOT NULL, "eventId" integer, "userId" integer NOT NULL, CONSTRAINT "PK_25e539fe4a041022792c78266c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "final_nos_summary" ("id" SERIAL NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, "rows" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4c7a116a87b6e7034559fcdaafa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_final_nos_summary_event_user" ON "final_nos_summary" ("eventId", "userId") `);
        await queryRunner.query(`CREATE TABLE "ingredient" ("id" SERIAL NOT NULL, "ingredientName" character varying NOT NULL, "category" character varying NOT NULL, "pricePerKg" integer NOT NULL, CONSTRAINT "PK_6f1e945604a0b59f56a57570e98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "box_range" ("id" SERIAL NOT NULL, "priceRange" character varying NOT NULL, "boxType" text NOT NULL, "gramPerBox" double precision NOT NULL, "eventId" integer, "userId" integer NOT NULL, CONSTRAINT "PK_9a0b18ca965e8fbd9fcff84a571" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "annkut_sidhu_saman" ("id" SERIAL NOT NULL, "mithai_id" integer NOT NULL, "mithai_name" character varying NOT NULL, "total_nang" double precision NOT NULL, "total_flour" double precision NOT NULL, "eventId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_d6cf959b2e98dfc4405d7ce31a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "annkut_food_selection" ("id" SERIAL NOT NULL, "foodItemId" integer, "vangiName" character varying NOT NULL, "eventId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_78732ab4926c042a382db2cd0cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "activity_logs" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "action" character varying NOT NULL, "details" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "recipe" ADD CONSTRAINT "FK_fe30fdc515f6c94d39cd4bbfa76" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_01cd2b829e0263917bf570cb672" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "weight_entry" ADD CONSTRAINT "FK_5b9e49664a5477da59fa1dabb10" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" ADD CONSTRAINT "FK_288615072a71119708a4fb08f4f" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" ADD CONSTRAINT "FK_d04299cb1c777942431baf74880" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_vasan_summary" ADD CONSTRAINT "FK_6f53dca859b14cb6d5504bb342b" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan" ADD CONSTRAINT "FK_8e10d0923ec89d0aa4283b0814c" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_41fbf19e3b5759039a22cb2e569" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_layout" ADD CONSTRAINT "FK_56d98ce321b9aefad443cc908af" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_4c71cc80bdca8a10c72958c2686" FOREIGN KEY ("vasanId") REFERENCES "vasan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_cf7a2c7026143510bf3c911b261" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "box_weight_entry" ADD CONSTRAINT "FK_0c43bdfd0901de0ca5fd702afb5" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "final_nos_summary" ADD CONSTRAINT "FK_2c74d2bcdeeef31c19ff0394849" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "box_range" ADD CONSTRAINT "FK_667d00f0e65839f5cf174fe649c" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD CONSTRAINT "FK_80b6c934e773dfa013d2af15a25" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_a2ec8aff0254aff8d93c368dfdc" FOREIGN KEY ("foodItemId") REFERENCES "food_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_0cf76b3bbbe0439d2d15243cdcb" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_597e6df96098895bf19d4b5ea45" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_597e6df96098895bf19d4b5ea45"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_0cf76b3bbbe0439d2d15243cdcb"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_a2ec8aff0254aff8d93c368dfdc"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP CONSTRAINT "FK_80b6c934e773dfa013d2af15a25"`);
        await queryRunner.query(`ALTER TABLE "box_range" DROP CONSTRAINT "FK_667d00f0e65839f5cf174fe649c"`);
        await queryRunner.query(`ALTER TABLE "final_nos_summary" DROP CONSTRAINT "FK_2c74d2bcdeeef31c19ff0394849"`);
        await queryRunner.query(`ALTER TABLE "box_weight_entry" DROP CONSTRAINT "FK_0c43bdfd0901de0ca5fd702afb5"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_cf7a2c7026143510bf3c911b261"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_4c71cc80bdca8a10c72958c2686"`);
        await queryRunner.query(`ALTER TABLE "section_layout" DROP CONSTRAINT "FK_56d98ce321b9aefad443cc908af"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_41fbf19e3b5759039a22cb2e569"`);
        await queryRunner.query(`ALTER TABLE "vasan" DROP CONSTRAINT "FK_8e10d0923ec89d0aa4283b0814c"`);
        await queryRunner.query(`ALTER TABLE "section_vasan_summary" DROP CONSTRAINT "FK_6f53dca859b14cb6d5504bb342b"`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" DROP CONSTRAINT "FK_d04299cb1c777942431baf74880"`);
        await queryRunner.query(`ALTER TABLE "weight_calculation_entry" DROP CONSTRAINT "FK_288615072a71119708a4fb08f4f"`);
        await queryRunner.query(`ALTER TABLE "weight_entry" DROP CONSTRAINT "FK_5b9e49664a5477da59fa1dabb10"`);
        await queryRunner.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_01cd2b829e0263917bf570cb672"`);
        await queryRunner.query(`ALTER TABLE "recipe" DROP CONSTRAINT "FK_fe30fdc515f6c94d39cd4bbfa76"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
        await queryRunner.query(`DROP TABLE "annkut_food_selection"`);
        await queryRunner.query(`DROP TABLE "annkut_sidhu_saman"`);
        await queryRunner.query(`DROP TABLE "box_range"`);
        await queryRunner.query(`DROP TABLE "ingredient"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_final_nos_summary_event_user"`);
        await queryRunner.query(`DROP TABLE "final_nos_summary"`);
        await queryRunner.query(`DROP TABLE "box_weight_entry"`);
        await queryRunner.query(`DROP TABLE "vasan_fill_plan"`);
        await queryRunner.query(`DROP TABLE "section_layout"`);
        await queryRunner.query(`DROP TABLE "food_item"`);
        await queryRunner.query(`DROP TABLE "sections"`);
        await queryRunner.query(`DROP TABLE "vasan"`);
        await queryRunner.query(`DROP TABLE "section_vasan_summary"`);
        await queryRunner.query(`DROP TABLE "vasan_nos_calculation_entry"`);
        await queryRunner.query(`DROP TABLE "weight_calculation_entry"`);
        await queryRunner.query(`DROP TABLE "weight_entry"`);
        await queryRunner.query(`DROP TABLE "event"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "recipe"`);
    }

}
