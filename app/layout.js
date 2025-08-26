import "./globals.css";

export const metadata = {
  applicationName: "근육고양이만화책",
  title: {
    default: "근육고양이만화책",
    template: "근육고양이만화책",
  },
  description: "근육고양이만화책",
  keywords: ["근육고양이만화책"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "근육고양이만화책",
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "근육고양이만화책",
    title: {
      default: "근육고양이만화책",
      template: "근육고양이만화책",
    },
    description: "근육고양이만화책",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFFFF",
  standalone: true
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
