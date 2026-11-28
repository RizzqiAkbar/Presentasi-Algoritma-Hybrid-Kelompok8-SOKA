import org.cloudbus.cloudsim.*;
import org.cloudbus.cloudsim.core.CloudSim;
import org.cloudbus.cloudsim.provisioners.*;
import org.example.MetaScheduler;
import java.io.*;
import java.lang.reflect.Method;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

/** Runs the original search methods unchanged on one common CloudSim 3.0.3 model. */
public class ControlledBenchmark {
    static final int[] MIPS = {500,1000,1500,2000,2500,500,1000,1500,2000,2500};
    static final String[] ALGORITHMS = {"hybrid-aco","aco","gwo","hybrid-ga"};
    static final int[] SEEDS = {1,2,3,4,5,6,7,8,9,10};
    static Method hybridAco, hybridGa;
    static boolean equalSearchBudget;

    static long[] load(Path file) throws IOException {
        Matcher matcher=Pattern.compile("\"length_mi\"\\s*:\\s*(\\d+)").matcher(Files.readString(file));
        List<Long> values=new ArrayList<>(); while(matcher.find())values.add(Long.parseLong(matcher.group(1)));
        return values.stream().mapToLong(Long::longValue).toArray();
    }
    static int[] search(String name,long[] lengths,int seed) throws Exception {
        double[] len=Arrays.stream(lengths).asDoubleStream().toArray(), mips=Arrays.stream(MIPS).asDoubleStream().toArray();
        double[][] et=new double[len.length][MIPS.length];
        for(int t=0;t<len.length;t++)for(int v=0;v<MIPS.length;v++)et[t][v]=len[t]/mips[v];
        if(name.equals("hybrid-aco"))return (int[])hybridAco.invoke(null,et,new Random(seed));
        if(name.equals("hybrid-ga"))return (int[])hybridGa.invoke(null,et,new Random(seed));
        int[] pes=new int[MIPS.length];Arrays.fill(pes,1);
        MetaScheduler original=new MetaScheduler(len,mips,pes);
        return name.equals("aco")?original.runAco(seed,equalSearchBudget?25:20,equalSearchBudget?50:100).assignment:original.runGwo(seed,50,equalSearchBudget?24:25).assignment;
    }
    static double[] model(long[] lengths,int[] mapping) {
        double[] loads=new double[MIPS.length];
        for(int t=0;t<lengths.length;t++){if(mapping[t]<0||mapping[t]>=MIPS.length)throw new AssertionError("invalid VM");loads[mapping[t]]+=(double)lengths[t]/MIPS[mapping[t]];}
        return loads;
    }
    static Datacenter datacenter() throws Exception {
        List<Host> hosts=new ArrayList<>();
        for(int i=0;i<10;i++) {
            List<Pe> pes=List.of(new Pe(0,new PeProvisionerSimple(100000)));
            hosts.add(new Host(i,new RamProvisionerSimple(32768),new BwProvisionerSimple(100000),1000000,pes,new VmSchedulerTimeShared(pes)));
        }
        DatacenterCharacteristics characteristics=new DatacenterCharacteristics("x86","Linux","Xen",hosts,10,3,.05,.001,0);
        return new Datacenter("CommonDatacenter",characteristics,new VmAllocationPolicySimple(hosts),new LinkedList<>(),0);
    }
    static double[] simulate(long[] lengths,int[] mapping) throws Exception {
        CloudSim.init(1,new GregorianCalendar(2026,Calendar.NOVEMBER,26),false);datacenter();
        DatacenterBroker broker=new DatacenterBroker("CommonBroker");
        List<Vm> vms=new ArrayList<>();
        for(int v=0;v<MIPS.length;v++)vms.add(new Vm(v,broker.getId(),MIPS[v],1,2048,10000,10000,"Xen",new CloudletSchedulerSpaceShared()));
        broker.submitVmList(vms);List<Cloudlet> tasks=new ArrayList<>();UtilizationModel full=new UtilizationModelFull();
        for(int t=0;t<lengths.length;t++){Cloudlet c=new Cloudlet(t,lengths[t],1,300,300,full,full,full);c.setUserId(broker.getId());tasks.add(c);}
        broker.submitCloudletList(tasks);
        for(int t=0;t<lengths.length;t++)broker.bindCloudletToVm(t,mapping[t]);
        CloudSim.startSimulation();List<Cloudlet> finished=broker.getCloudletReceivedList();CloudSim.stopSimulation();
        if(finished.size()!=lengths.length)throw new AssertionError("incomplete simulation");
        double start=finished.stream().mapToDouble(Cloudlet::getExecStartTime).min().orElseThrow();
        double absoluteEnd=finished.stream().mapToDouble(Cloudlet::getFinishTime).max().orElseThrow();
        double ms=absoluteEnd-start,total=0;double[] loads=new double[MIPS.length];
        for(Cloudlet c:finished){total+=c.getActualCPUTime();loads[c.getVmId()]+=c.getActualCPUTime();}
        double max=Arrays.stream(loads).max().orElseThrow(),min=Arrays.stream(loads).min().orElseThrow(),avg=total/MIPS.length;
        double predicted=Arrays.stream(model(lengths,mapping)).max().orElseThrow();
        if(Math.abs(predicted-ms)>Math.max(.5,predicted*.001))throw new AssertionError("CloudSim/model gap exceeds 0.1% or 0.5s: "+ms+" != "+predicted);
        return new double[]{ms,(max-min)/(avg+1e-9),total/(ms*MIPS.length+1e-9)*100,total*3,absoluteEnd,start,predicted,Math.abs(ms-predicted)/predicted*100};
    }
    public static void main(String[] args) throws Exception {
        if(args.length<2)throw new IllegalArgumentException("dataset directory and output directory required");
        hybridAco=Hybrid.class.getDeclaredMethod("scheduleHybridMaxMinACO",double[][].class,Random.class);hybridAco.setAccessible(true);
        hybridGa=Hybrid.class.getDeclaredMethod("scheduleHybridMinMinGA",double[][].class,Random.class);hybridGa.setAccessible(true);
        Log.disable();Path out=Path.of(args[1]);Files.createDirectories(out);
        int maxN=args.length>2?Integer.parseInt(args[2]):1000;
        equalSearchBudget=args.length>3&&args[3].equals("equal-search");
        String[] algorithms=equalSearchBudget?new String[]{"hybrid-aco","aco","gwo"}:ALGORITHMS;
        // Warm each search implementation; these samples are excluded from recorded results.
        long[] warm=load(Path.of(args[0],"GoCJ_Dataset_100.json"));for(String algorithm:algorithms)search(algorithm,warm,42);
        try(PrintWriter csv=new PrintWriter(Files.newBufferedWriter(out.resolve("controlled-runs.csv")));PrintWriter assignments=new PrintWriter(Files.newBufferedWriter(out.resolve("controlled-assignments.jsonl")))) {
            csv.println("n,seed,algorithm,ms,doi,util,cost,time,absoluteFinish,firstStart,modelMs,modelGapPct,evaluations,status");
            for(int n=100;n<=maxN;n+=100) {
                long[] lengths=load(Path.of(args[0],"GoCJ_Dataset_"+n+".json"));if(lengths.length!=n)throw new AssertionError("wrong dataset count");
                for(int seed:SEEDS)for(int position=0;position<algorithms.length;position++) {
                    // Rotate order by seed, reducing systematic warm-cache/order preference.
                    String algorithm=algorithms[(position+seed-1)%algorithms.length];
                    long started=System.nanoTime();int[] mapping=search(algorithm,lengths,seed);double runtime=(System.nanoTime()-started)/1e6;
                    double[] metrics=simulate(lengths,mapping);
                    int eval=algorithm.equals("hybrid-aco")?1251:equalSearchBudget?1250:algorithm.equals("aco")?2000:algorithm.equals("gwo")?1300:10151;
                    csv.printf(Locale.ROOT,"%d,%d,%s,%.10f,%.10f,%.10f,%.10f,%.6f,%.10f,%.10f,%.10f,%.10f,%d,ok%n",n,seed,algorithm,metrics[0],metrics[1],metrics[2],metrics[3],runtime,metrics[4],metrics[5],metrics[6],metrics[7],eval);csv.flush();
                    assignments.printf("{\"n\":%d,\"seed\":%d,\"algorithm\":\"%s\",\"mapping\":%s}%n",n,seed,algorithm,Arrays.toString(mapping));assignments.flush();
                }
                System.err.println("Completed "+n+" tasks: "+(10*algorithms.length)+" successful runs");
            }
        }
    }
}
