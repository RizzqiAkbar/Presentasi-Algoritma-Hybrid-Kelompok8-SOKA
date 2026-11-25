import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Random;

public class JavaParity {
    static class SharedRandom extends Random {
        private int state;
        SharedRandom(int seed) { state = seed; }
        public double nextDouble() {
            state += 0x6d2b79f5;
            int t = (state ^ (state >>> 15)) * (1 | state);
            t ^= t + ((t ^ (t >>> 7)) * (61 | t));
            return Integer.toUnsignedLong(t ^ (t >>> 14)) / 4294967296.0;
        }
        public int nextInt(int bound) { return (int) (nextDouble() * bound); }
    }
    public static void main(String[] args) throws Exception {
        double[][][] matrices = {
            {{2,4},{6,3},{8,5}},
            {{5,2,8},{3,9,2},{6,4,3},{9,7,2},{1,8,6},{4,3,5}},
            {{3},{5},{1}}, {{1,1},{1,1},{1,1}}
        };
        String[] methods = {"runMaxMin", "runMinMin", "scheduleHybridMaxMinACO", "scheduleHybridMinMinGA"};
        System.out.print("[");
        boolean comma = false;
        for (int m = 0; m < matrices.length; m++) {
            for (int seed : new int[]{8,42}) {
                for (String name : methods) {
                    boolean hybrid = name.startsWith("schedule");
                    Method method = hybrid ? Hybrid.class.getDeclaredMethod(name,double[][].class,Random.class) : Hybrid.class.getDeclaredMethod(name,double[][].class);
                    method.setAccessible(true);
                    int[] mapping = (int[]) (hybrid ? method.invoke(null,matrices[m],new SharedRandom(seed)) : method.invoke(null,(Object)matrices[m]));
                    if (comma) System.out.print(","); comma = true;
                    System.out.print("{\"matrix\":"+m+",\"seed\":"+seed+",\"method\":\""+name+"\",\"mapping\":"+Arrays.toString(mapping)+"}");
                }
            }
        }
        System.out.println("]");
    }
}
