import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RatesConfig from './pages/RatesConfig'
import StructuralTakeoff from './pages/StructuralTakeoff'
import MiscMetals from './pages/MiscMetals'
import Stairs from './pages/Stairs'
import Railings from './pages/Railings'
import Ladder from './pages/Ladder'
import JoistReinf from './pages/JoistReinf'
import Equipment from './pages/Equipment'
import PurchasedItems from './pages/PurchasedItems'
import SoftCosts from './pages/SoftCosts'
import Summary from './pages/Summary'
import Quote from './pages/Quote'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rates" element={<RatesConfig />} />
        <Route path="/structural" element={<StructuralTakeoff />} />
        <Route path="/misc-metals" element={<MiscMetals />} />
        <Route path="/stairs" element={<Stairs />} />
        <Route path="/railings" element={<Railings />} />
        <Route path="/ladder" element={<Ladder />} />
        <Route path="/joist-reinf" element={<JoistReinf />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/purchased" element={<PurchasedItems />} />
        <Route path="/soft-costs" element={<SoftCosts />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/quote" element={<Quote />} />
      </Routes>
    </Layout>
  )
}
