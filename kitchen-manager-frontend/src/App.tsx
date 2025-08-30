// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // or './pages/Dashboard'
import Dashboard from './pages/Dashboard';
import AddFoodItem from './pages/FoddItemMaster';
import AddIngrediants from './pages/IngredientsMaster';
import RecipeEntry from './pages/RecipeEntry';
import Login from './pages/login';
import CreateUser from './pages/CreateUser';
import EventMaster from './pages/EventMaster';
import WeightEntry from './pages/WeightMaster';
import BoxWeightEntry from './pages/BoxNosMaster';
import WeightCalculation from './pages/WeightCalculation';
import AnnkutNosSummary from './pages/AnnkutNosSummary';
import FinalNosSummary from './pages/FinalNosSummary';
import BoxRangeEntry from './pages/BoxRangeMaster';
import AnnkutSidhuSaman from './pages/AnnkutIngredientSummary';
import FinalIngredientSummary from './pages/FinalIngredientSummary';
import AnnkutComparison from './pages/AnnkutComparison';
import { AnnkutEventProvider } from './contexts/AnnkutEventContext';
import SectionMaster from './pages/SectionMaster';
import Profile from './pages/Profile';
import VasanMaster from './pages/VasanMaster';
import VasanNosCalculation from './pages/VasanNosCalculation';
import SectionIngredientSummary from './pages/SectionIngredientSummary';
import SectionNosSummary from './pages/SectionNosSummary';
import VasanFillPlan from './pages/VasanFillPlan';
import SectionLayoutPlanner from './pages/SectionLayoutPlanner';
import AnnkutFoodSelectionMaster from './pages/AnnkutFoodSelectionMaster';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard/*"
        element={
          <AnnkutEventProvider>
            <Home />
          </AnnkutEventProvider>
        }
      >
          <Route index element={<Dashboard />} />
          <Route path="add-food-item" element={<AddFoodItem />} />
          <Route path="add-ingredient" element={<AddIngrediants />} />
          <Route path="recipe-entry" element={<RecipeEntry />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="event-master" element={<EventMaster />} />
          <Route path="box-annkut/weight-entry" element={<WeightEntry />} />
          <Route path="annkut/food-selection" element={<AnnkutFoodSelectionMaster />} />
          <Route path="box-annkut/box-weight-entry" element={<BoxWeightEntry />} /> 
          <Route path="box-annkut/WeightCalculation" element={<WeightCalculation />} /> 
          <Route path="box-annkut/AnnkutNosSummary" element={<AnnkutNosSummary/>} />   
          <Route path="FinalNosSummary" element={<FinalNosSummary />} />
          <Route path="FinalIngredientSummary" element={<FinalIngredientSummary />} />
          <Route path="box-annkut/AnnkutSidhuSaman" element={<AnnkutSidhuSaman/>} />   
          <Route path="box-annkut/BoxRangeEntry" element={<BoxRangeEntry />} />
          <Route path="box-annkut/annkut-comparison" element={<AnnkutComparison />} />
          <Route path="section-annkut/section-master" element={<SectionMaster />} />
          <Route path="section-annkut/vasan-master" element={<VasanMaster />} />
          <Route path="section-annkut/vasan-nos-calculation" element={<VasanNosCalculation />} />
          <Route path="section-annkut/section-ingredient-summary" element={<SectionIngredientSummary />} />
          <Route path="section-annkut/section-nos-summary" element={<SectionNosSummary />} />
          <Route path="section-annkut/vasan-fill-plan" element={<VasanFillPlan />} />
          <Route path="section-annkut/layout-planner" element={<SectionLayoutPlanner />} />
          {/* Legacy path redirect */}
          <Route path="section-master" element={<Navigate to="/dashboard/section-annkut/section-master" replace />} />
          <Route path="profile" element={<Profile />} />
        </Route>
    </Routes>
  );
}

export default App;
