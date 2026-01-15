import { RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { router } from './router'
import './styles/globals.css'

const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)
	root.render(<RouterProvider router={router} />)
}
