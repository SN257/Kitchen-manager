import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './config/typeorm.config';
import { FoodItemModule } from './food-item/food-item.module';
import { IngredientsModule } from './ingredient/ingredient.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RecipesModule } from './recipes/recipes.module';
import { EventsModule } from './events/events.module';
import { WeightEntryModule } from './weight-entry/weight-entry.module';
import { BoxWeightEntryModule } from './box-weight-entry/box-weight-entry.module';
import { WeightCalculationEntryModule } from './weight-calculation-entry/weight-calculation-entry.module';
import { BoxRangeModule } from './box-range/box-range.module';
import { AnnkutSidhuSamanModule } from './annkut-sidhu-saman/annkut-sidhu-saman.module';
import { SectionsModule } from './sections/sections.module';
import { VasanModule } from './vasan/vasan.module';
import { VasanNosCalculationEntryModule } from './vasan-nos-calculation-entry/vasan-nos-calculation-entry.module';
import { VasanFillPlanModule } from './vasan-fill-plan/vasan-fill-plan.module';
import { SectionVasanSummaryModule } from './section-vasan-summary/section-vasan-summary.module';
import { SectionLayoutModule } from './section-layout/section-layout.module';
import { FinalNosSummaryModule } from './final-nos-summary/final-nos-summary.module';
import { AnnkutFoodSelectionModule } from './annkut-food-selection/annkut-food-selection.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    FoodItemModule,
    IngredientsModule,
    UserModule,
    AuthModule,
    RecipesModule,
    EventsModule,
    WeightEntryModule,
    BoxWeightEntryModule,
    WeightCalculationEntryModule,
    BoxRangeModule,
    AnnkutSidhuSamanModule,
    SectionsModule,
    VasanModule,
    VasanNosCalculationEntryModule,
    VasanFillPlanModule,
    SectionVasanSummaryModule,
    SectionLayoutModule,
    FinalNosSummaryModule,
    AnnkutFoodSelectionModule,
  ],
})
export class AppModule {}
