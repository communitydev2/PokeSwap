import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/pokeList/PokeCard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/pokeList/PokeCard"!</div>
}
