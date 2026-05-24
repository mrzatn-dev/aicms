import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './components/ClientProviders';

export const metadata: Metadata = {
    title: 'AI-Powered CMS | Content Management System',
    description: 'Modern content management system with AI-powered analysis, validation, and microservice architecture',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen flex flex-col">
                <ClientProviders>
                    {children}
                </ClientProviders>
            </body>
        </html>
    );
}
