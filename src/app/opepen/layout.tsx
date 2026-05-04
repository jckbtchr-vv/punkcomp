import OpepenTicker from "@/components/OpepenTicker";

export default function OpepenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OpepenTicker />
      {children}
    </>
  );
}
