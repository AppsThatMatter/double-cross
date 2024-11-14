import { Navbar } from "./components/Navbar";
export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background-blue to-background-red">
      <Navbar />
    </div>
  );
}
