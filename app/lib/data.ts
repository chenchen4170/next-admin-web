import postgres from "postgres";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import { invoices, customers, revenue } from "./placeholder-data";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

export async function fetchRevenue() {
  try {
    console.log("Fetching revenue data...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = revenue;

    console.log("Data fetch completed after 3 seconds.");

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    const data = invoices
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((invoice) => {
        const customer = customers.find((c) => c.id === invoice.customer_id);
        return {
          id: invoice.customer_id, // Using customer_id as id since invoices don't have id
          amount: invoice.amount,
          name: customer?.name ?? "Unknown",
          image_url: customer?.image_url ?? "",
          email: customer?.email ?? "",
        };
      });

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    const invoiceCountPromise = Promise.resolve([{ count: invoices.length }]);
    const customerCountPromise = Promise.resolve([{ count: customers.length }]);
    const invoiceStatusPromise = Promise.resolve([
      {
        paid: invoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + inv.amount, 0),
        pending: invoices
          .filter((inv) => inv.status === "pending")
          .reduce((sum, inv) => sum + inv.amount, 0),
      },
    ]);

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0][0].count ?? "0");
    const numberOfCustomers = Number(data[1][0].count ?? "0");
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? "0");
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? "0");

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const data = invoices.map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      return {
        id: invoice.customer_id + "-" + invoice.date, // mock database id
        amount: invoice.amount,
        date: invoice.date,
        status: invoice.status,
        name: customer?.name ?? "Unknown",
        email: customer?.email ?? "",
        image_url: customer?.image_url ?? "",
      };
    });

    const filteredInvoices = data.filter((invoice) => {
      return invoice.name.includes(query) || invoice.email.includes(query);
    });

    const pagedInvoices = filteredInvoices.slice(
      offset,
      offset + ITEMS_PER_PAGE,
    );

    return pagedInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
   
    const data = invoices.map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      return {
        id: invoice.customer_id + "-" + invoice.date, // mock database id
        amount: invoice.amount,
        date: invoice.date,
        status: invoice.status,
        name: customer?.name ?? "Unknown",
        email: customer?.email ?? "",
        image_url: customer?.image_url ?? "",
      };
    });

    const filteredInvoices = data.filter((invoice) => {
      return invoice.name.includes(query) || invoice.email.includes(query);
    });

    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {

    const data = invoices.map((invoice) => ({
      id: invoice.customer_id + "-" + invoice.date, // mock database id
      amount: invoice.amount,
      status: invoice.status,
      customer_id: invoice.customer_id,
    })).find((invoice) => invoice.id === id);

    //convert amount from cents to dollars
    if (data) {
      data.amount = data.amount / 100;
    }

    //convert data to InvoiceForm
    const invoice: InvoiceForm = {
      id: data?.id ?? "",
      customer_id: data?.customer_id ?? "",
      amount: data?.amount ?? 0,
      status: data?.status as 'pending' | 'paid' ?? 'pending',
    };

    return invoice;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const data = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
    }));

    return data;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
