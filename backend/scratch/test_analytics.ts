import { getMonthlyAnalytics } from '../src/services/admin.service';

async function test() {
  try {
    const data = await getMonthlyAnalytics();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}

test();
