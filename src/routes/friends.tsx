import { createFileRoute } from '@tanstack/react-router';
import { FriendsPage } from '../components/friends/FriendsPage';
export const Route = createFileRoute('/friends')({ component: FriendsPage });
