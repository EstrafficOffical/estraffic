// Legacy endpoint kept as an alias so all registrations use the same
// NEXUS application lifecycle and cannot create orphan PENDING users.
export { POST, dynamic } from "../auth/signup/route";
