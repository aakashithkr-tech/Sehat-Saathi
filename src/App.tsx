import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Guidance = lazy(() => import("./pages/Guidance"));
const Resources = lazy(() => import("./pages/Resources"));
const Facilities = lazy(() => import("./pages/Facilities"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="features" element={<Features />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="guidance" element={<Guidance />} />
          <Route path="resources" element={<Resources />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

