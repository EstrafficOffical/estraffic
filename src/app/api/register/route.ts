// Legacy endpoint kept as an alias so all registrations use the same
// NEXUS application lifecycle and cannot create orphan PENDING users.
export { /* @next-codemod-error `POST` export is re-exported. Check if this component uses `params` or `searchParams`*/
POST, dynamic } from "../auth/signup/route";
