'use client';

import { useParams } from 'next/navigation';

export default function Checkout() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold">Checkout</h1>
        <p className="mb-4 text-center text-gray-600">User ID: {userId}</p>
        <p className="text-center text-green-600">
          ✅ Rota do checkout está funcionando!
        </p>
      </div>
    </div>
  );
}
