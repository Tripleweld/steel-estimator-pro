import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PasswordGate from './components/PasswordGate'
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
import UserManual from './pages/UserManual'
import PMDashboard from './pages/PMDashboard'
import PMSchedule from './pages/PMSchedule'
import PMChangeOrders from './pages/PMChangeOrders'
import PMFieldReports from './pages/PMFieldReports'
import PMTracking from './pages/PMTracking'
import PMShopDrawings from './pages/PMShopDrawings'
import TenderInbox from './pages/TenderInbox'
import GCDirectory from './pages/GCDirectory'
import FabInstallStandards from './pages/FabInstallStandards'
import AiTakeoff from './pages/AiTakeoff'
import NewProject from './pages/NewProject'
import ExistingProjects from './pages/ExistingProjects'

export default function App() {
  return (
    <PasswordGate>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rates" element={<RatesConfig />} />
        <Route path="/fab-install-standards" element={<FabInstallStandards />} />
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
        <Route path="/ai-takeoff" element={<AiTakeoff />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route path="/projects" element={<ExistingProjects />} />
            <Route path="/manual" element={<UserManual />} />
        <Route path="/pm/dashboard" element={<PMDashboard />} />
        <Route path="/pm/sov" element={<PMSchedule />} />
        <Route path="/pm/change-orders" element={<PMChangeOrders />} />
        <Route path="/pm/field-reports" element={<PMFieldReports />} />
        <Route path="/pm/tracking" element={<PMTracking />} />
        <Route path="/pm/shop-drawings" element={<PMShopDrawings />} />
        <Route path="/tenders/inbox" element={<TenderInbox />} />
        <Route path="/tenders/gc-directory" element={<GCDirectory />} />
      </Routes>
    </Layout>
    </PasswordGate>
  )
}
