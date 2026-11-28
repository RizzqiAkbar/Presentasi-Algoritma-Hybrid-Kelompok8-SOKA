import java.util.Random;

/** Reproduces only infrastructure draws from Main/Tuning, preserving their exact draw order. */
public class InfrastructureAudit {
    public static void main(String[] args) {
        Random host = new Random(42), vm = new Random(99);
        long hostCapacity=0, vmCapacity=0;int totalPes=0;
        StringBuilder hosts=new StringBuilder(),vms=new StringBuilder();
        for(int i=0;i<15;i++) {
            int pe=4+host.nextInt(13),mips=1000+host.nextInt(2001),ram=4096+host.nextInt(12289);hostCapacity+=(long)pe*mips;
            if(i>0)hosts.append(',');hosts.append(String.format("{\"id\":%d,\"pes\":%d,\"mipsPerPe\":%d,\"ramMB\":%d}",i,pe,mips,ram));
        }
        for(int i=0;i<30;i++) {
            int mips=250+vm.nextInt(751),pe=1+vm.nextInt(4),ram=512+vm.nextInt(1537);totalPes+=pe;vmCapacity+=(long)pe*mips;
            if(i>0)vms.append(',');vms.append(String.format("{\"id\":%d,\"pes\":%d,\"mipsPerPe\":%d,\"ramMB\":%d}",i,pe,mips,ram));
        }
        System.out.printf("{\"hosts\":[%s],\"vms\":[%s],\"hostTotalMips\":%d,\"vmTotalMips\":%d,\"vmTotalPes\":%d}%n",hosts,vms,hostCapacity,vmCapacity,totalPes);
    }
}
