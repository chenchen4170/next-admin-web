import postgres from 'postgres';
import { customers, invoices } from '@/app/lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function listInvoices() {
	return invoices
    .filter((invoice) => invoice.amount === 666)
    .map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      return {
        amount: invoice.amount,
        name: customer?.name ?? "Unknown",
      };
    });
}

export async function GET() {
  try {
  	return Response.json(await listInvoices());
  } catch (error) {
  	return Response.json({ error }, { status: 500 });
  }
}
