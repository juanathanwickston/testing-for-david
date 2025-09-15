export const metadata = {
  title: "ONEPOS Wizard",
  description: "Hardware eligibility & profitability wizard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
