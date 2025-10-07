import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VasanNosCalculationEntry } from '../entities/vasan-nos-calculation-entry.entity';
import { CreateVasanNosCalculationEntryDto } from './dto/create-vasan-nos-calculation-entry.dto';
import { SectionVasanSummaryService } from '../section-vasan-summary/section-vasan-summary.service';
import { VasanFillPlanService } from '../vasan-fill-plan/vasan-fill-plan.service';
import { RecipesService } from '../recipes/recipes.service';
import { WeightEntryService } from '../weight-entry/weight-entry.service';

const logger = new Logger('VasanNosCalculationEntryService');

@Injectable()
export class VasanNosCalculationEntryService {
  constructor(
    @InjectRepository(VasanNosCalculationEntry)
    private repo: Repository<VasanNosCalculationEntry>,
    private readonly sectionVasanSummaryService?: SectionVasanSummaryService,
    private readonly vasanFillPlanService?: VasanFillPlanService,
    private readonly recipesService?: RecipesService,
    private readonly weightEntryService?: WeightEntryService,
  ) {}

  async create(dto: CreateVasanNosCalculationEntryDto, userId: number) {
    const entry = this.repo.create({ ...dto, userId });
    return this.repo.save(entry);
  }

  async update(
    id: number,
    dto: CreateVasanNosCalculationEntryDto,
    userId: number,
  ) {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) throw new Error('Entry not found or access denied');
    await this.repo.update(id, {
      entries: dto.entries as any,
      eventId: dto.eventId ?? existing.eventId,
    });
    return this.repo.findOneBy({ id });
  }

  // Recompute and save section vasan summary for an event+user
  async recomputeAndSaveSummary(eventId: number, userId: number) {
    try {
      if (!this.sectionVasanSummaryService || !this.vasanFillPlanService) {
        logger.warn('Recompute skipped because dependent services are not available');
        return;
      }

      // Fetch latest fill plans for event
      const fillPlans = await this.vasanFillPlanService.findAll(eventId, userId);

      // Fetch latest nos calculation for this event+user
      const latestNos = await this.findLatestByEventAndUser(eventId, userId);
      const nosEntries = (latestNos && Array.isArray(latestNos.entries)) ? latestNos.entries : [];

      // Fetch recipes and weight entries
      const recipes = this.recipesService ? await this.recipesService.findByUser(userId) : [];
      const weightEntries = this.weightEntryService ? await this.weightEntryService.findByEventIdAndUser(eventId, userId) : [];

      // Build helper maps
      const keyFor = (vasanId: number, foodName: string) => `${vasanId}::${(foodName||'').toLowerCase()}`;
      const nosEntryMap = new Map<string, any>();
      const groupedEntries: any[] = [];
      (nosEntries||[]).forEach((e:any) => {
        if (e.foodName && e.foodName.includes(',')) groupedEntries.push(e);
        else if (e.foodName) nosEntryMap.set(keyFor(e.vasanId, e.foodName), e);
      });

      const weightMap = new Map((weightEntries||[]).map((w:any) => [ (w.vangiName||'').trim().toLowerCase(), Number(w.gram)||0 ]));

      const agg = new Map<string, any>();

      const vasanFoodIndex = new Map<string, number>();

      (fillPlans||[]).forEach((plan:any) => {
        (plan.foodPlans||[]).forEach((foodPlan:any) => {
          const vasanFoodKey = `${plan.vasanId}::${(foodPlan.foodName||'').toLowerCase()}`;
          const currentIndex = vasanFoodIndex.get(vasanFoodKey) || 0;
          vasanFoodIndex.set(vasanFoodKey, currentIndex + 1);

          let planNos = 0;
          let planTotalWeightKg = 0;
          let entryFound = false;

          const preferGrouped = currentIndex > 0;

          if (preferGrouped) {
            for (const grouped of groupedEntries) {
              if (grouped.vasanId === plan.vasanId && grouped.foodName) {
                const groupedFoods = grouped.foodName.split(',').map((f:string) => f.trim().toLowerCase());
                if (groupedFoods.includes((foodPlan.foodName||'').trim().toLowerCase())) {
                  planNos = grouped.totalVasan || 0;
                  planTotalWeightKg = planNos * (Number(foodPlan.fillWeightKg) || 0);
                  entryFound = true;
                  break;
                }
              }
            }
            if (!entryFound) {
              const ind = nosEntryMap.get(keyFor(plan.vasanId, foodPlan.foodName));
              if (ind) {
                planNos = ind.totalVasan || 0;
                planTotalWeightKg = planNos * (Number(foodPlan.fillWeightKg) || 0);
                entryFound = true;
              }
            }
          } else {
            const ind = nosEntryMap.get(keyFor(plan.vasanId, foodPlan.foodName));
            if (ind) {
              planNos = ind.totalVasan || 0;
              planTotalWeightKg = planNos * (Number(foodPlan.fillWeightKg) || 0);
              entryFound = true;
            }
            if (!entryFound) {
              for (const grouped of groupedEntries) {
                if (grouped.vasanId === plan.vasanId && grouped.foodName) {
                  const groupedFoods = grouped.foodName.split(',').map((f:string) => f.trim().toLowerCase());
                  if (groupedFoods.includes((foodPlan.foodName||'').trim().toLowerCase())) {
                    planNos = grouped.totalVasan || 0;
                    planTotalWeightKg = planNos * (Number(foodPlan.fillWeightKg) || 0);
                    entryFound = true;
                    break;
                  }
                }
              }
            }
          }

          if (planTotalWeightKg > 0) {
            const foodKey = (foodPlan.foodName || '').trim().toLowerCase();
            const displayName = foodPlan.foodName || '';

            // find recipe
            let recipe:any;
            if ((foodPlan.foodName || '').trim().startsWith('મગજ')) {
              recipe = (recipes||[]).find((r:any) => r.vangiName && r.vangiName.trim() === 'મગજ');
            } else {
              recipe = (recipes||[]).find((r:any) => (r.vangiName||'').toLowerCase() === (foodPlan.foodName||'').toLowerCase());
            }
            const flourForPlan = recipe && Number(recipe.items_per_kg) > 0 ? (planTotalWeightKg / Number(recipe.items_per_kg)) : 0;
            const gramPerPiece = weightMap.get((foodPlan.foodName||'').trim().toLowerCase()) || 0;
            const nangForPlan = gramPerPiece > 0 ? (planTotalWeightKg * 1000) / gramPerPiece : 0;

            if (!agg.has(foodKey)) {
              agg.set(foodKey, { id: plan.id, foodName: displayName, totalNos: planNos, totalWeightKg: planTotalWeightKg, flourRequiredKg: flourForPlan, totalNang: nangForPlan });
            } else {
              const cur = agg.get(foodKey);
              cur.totalWeightKg += planTotalWeightKg;
              cur.flourRequiredKg += flourForPlan;
              cur.totalNang += nangForPlan;
            }
          }
        });
      });

      const out = Array.from(agg.values()).map((v, idx) => ({ ...v, id: v.id || idx + 1 }));

      // Save to section vasan summary
      await this.sectionVasanSummaryService.createOrReplace({ eventId, rows: out }, userId);
      if (logger) logger.debug(`Recomputed and saved section summary for event ${eventId} user ${userId}`);
    } catch (err) {
      logger.error('Failed to recompute and save section summary', err);
    }
  }

  async findLatestByEventAndUser(eventId: number, userId: number) {
    return this.repo.findOne({
      where: { eventId, userId },
      order: { createdAt: 'DESC' },
      relations: ['event'],
    });
  }
}
