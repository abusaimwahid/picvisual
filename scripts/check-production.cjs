// Read-only infrastructure gate. Never print connection strings or credentials.
if (process.env.PICVISUAL_VERIFY_INFRA === '1') {
 const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
 (async()=>{
  const url=new URL(process.env.DATABASE_URL || 'https://missing.invalid');
  const neon=/\.neon\.tech$/.test(url.hostname);console.log('Database configuration:',{configured:Boolean(process.env.DATABASE_URL),protocol:url.protocol,local:['localhost','127.0.0.1','::1'].includes(url.hostname),neon});
  if(!neon)throw Error('NEON_CONFIGURATION_REQUIRED');
  const tlsRequired=['require','verify-full'].includes(url.searchParams.get('sslmode'));
  if(!tlsRequired)throw Error('DATABASE_TLS_REQUIRED');
  await db.$queryRaw`SELECT 1`;
  console.log('Neon connection with required TLS:',tlsRequired);
  const columns=await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='Project' AND column_name IN ('publishedSnapshot','publishedSlug')`;
  const migrations=await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at`;
  console.log('Applied migrations:',migrations.map(m=>m.migration_name).join(', '));
  console.log('Publication schema available:',columns.length===2);
  const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
  if(!cloud||!key||!secret)throw Error('CLOUDINARY_CONFIGURATION_REQUIRED');
  const response=await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`,{headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64')}});
  console.log('Cloudinary authenticated connectivity:',response.ok);if(!response.ok)throw Error('CLOUDINARY_CONNECTIVITY_FAILED');
  if(columns.length!==2)throw Error('REVIEWED_DATABASE_MIGRATION_REQUIRED');
 })().catch(e=>{console.error('Infrastructure gate failed:',/^[A-Z_]+$/.test(e.message)?e.message:'DATABASE_OR_PROVIDER_CONNECTION_FAILED');process.exitCode=1}).finally(()=>db.$disconnect());
}
