import React from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from 'next-themes'

const container = document.getElementById('root')

const root = createRoot(container)

root.render(
    <React.StrictMode>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <App/>
        </ThemeProvider>
    </React.StrictMode>
)
