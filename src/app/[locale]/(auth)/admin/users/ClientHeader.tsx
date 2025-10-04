'use client';
import { useState } from 'react';
import NavToggle from '@/app/components/NavToggle';
import NavDrawer from '@/app/components/NavDrawer';

export default function ClientHeader({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Пользователи</h1>
      <NavToggle onClick={() => setOpen(true)} title="Меню" />
      <NavDrawer open={open} onClose={() => setOpen(false)} locale={locale} />
    </div>
  );
}
