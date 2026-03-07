import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/reusableComponents/SearchBar')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/reusableComponents/SearchBar"!</div>
}
