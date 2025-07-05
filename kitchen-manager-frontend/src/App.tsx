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
import BoxWeightEntry from './pages/BoxWeightEntry';
import WeightCalculation from './pages/WeightCalculation';
import AnnkutNosSummary from './pages/AnnkutNosSummary';
import BoxRangeEntry from './pages/BoxRangeMaster';
import AnnkutSidhuSaman from './pages/AnnkutSidhuSaman';

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard/*" element={<Home />}>
      <Route index element={<Dashboard />} />
      <Route path="add-food-item" element={<AddFoodItem />} />
      <Route path="add-ingredient" element={<AddIngrediants />} />
      <Route path="recipe-entry" element={<RecipeEntry />} />
      <Route path="create-user" element={<CreateUser />} />
      <Route path="event-master" element={<EventMaster />} />
      <Route path="box-annkut/weight-entry" element={<WeightEntry />} />
      <Route path="box-annkut/box-weight-entry" element={<BoxWeightEntry />} /> 
      <Route path="box-annkut/WeightCalculation" element={<WeightCalculation />} /> 
      <Route path="box-annkut/AnnkutNosSummary" element={<AnnkutNosSummary/>} />   
      <Route path="box-annkut/AnnkutSidhuSaman" element={<AnnkutSidhuSaman/>} />   
      <Route path="box-annkut/BoxRangeEntry" element={<BoxRangeEntry />} />      
    </Route>

  </Routes>
);

export default App;