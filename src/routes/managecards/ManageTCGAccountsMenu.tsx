import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/managecards/ManageTCGAccountsMenu')({
  component: ManageTCGACcountsMenu,
})

export function ManageTCGACcountsMenu() {
  return <div>Hello "/managecards/ManageTCGAccounts"!</div>
}
