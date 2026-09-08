// Read-only infrastructure gate. Never print connection strings or credentials.
if (process.env.PICVISUAL_VERIFY_INFRA === '1') {
 const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
 (async()=>{
  const url=new URL(process.env.DATABASE_URL || 'https://missing.invalid');
  const neon=/\.neon\.tech$/.test(url.hostname);console.log('Production database uses Neon:',neon);
  if(!neon)throw Error('NEON_CONFIGURATION_REQUIRED');
  const ssl=await db.$queryRaw`SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()`;
  console.log('Database connection encrypted:',ssl[0]?.ssl===true);if(!ssl[0]?.ssl)throw Error('DATABASE_TLS_REQUIRED');
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
