# Java中队列与线程同步探究
在一个Android APP项目中，需要向设备发送数据，要求连续两条命令的发送间隔不能低于300ms。一开始的做法是在所有有可能连续发数据的地方手动加`Thread.sleep(300);`令线程阻塞，这样做问题很明显：一是可能会漏掉连续发送的地方；二是不好维护；三是如果在UI线程调用，会令UI卡住。为了解决这些问题，计划采用一个队列保存需要发送的数据，然后通过一个专门的线程从队列里取数据、发送、延时。  
为了探究线程和队列的具体用法，写了一个测试工程，基本框架是这样的：
```
public class Main {

    public static abstract class Sender extends Thread {
        abstract void append(int data);
    }

    static Date lastTime = new Date();

    static void send(int value) {
        Date now = new Date();
        long timeSpan = now.getTime() - lastTime.getTime();
        System.out.println("" + value + ": " + timeSpan);
        lastTime = now;
    }

    public static void main(String[] args) {
        Sender sender = new Sender();//实例化Sender，实际应当使用Sender的子类
        sender.start();
        sender.append(0);
        try {
            Thread.sleep(800);
        }
        catch(InterruptedException e) {
            e.printStackTrace();
        }
        sender.append(1);
        sender.append(2);
    }
}
```
首先写了一个Sender类继承Thread，并添加了一个append方法，用来向队列中添加数据。Sender是一个抽象类，其子类应当实现append方法，并在运行循环中从队列取数据，并调用class Main的send方法模拟发送数据。send方法将本地调用的时间和上次调用的时间相减并打印出来，用于判断两次调用的间隔有没有短于300ms。  
在main()函数中实例化Sender（此处不能直接new Sender()，而是应该用Sender的子类），并调用append函数追加待发送的数据，第一次和第二次追加之间间隔800ms，实际运行中，应当第二次发送数据比第一次晚800ms，第三次比第二次晚300ms。  
先来看Sender最初的实现：
```
    public static class SimpleSender extends Sender {

        Queue<Integer> queue = new LinkedList<Integer>();

        @Override
        public void append(int data) {
            queue.add(data);
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                Integer value = queue.poll();
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
```
队列（Queue）是先进先出的，此处用链表（LinkedList）实现。在append函数中调用队列的add方法向其末尾添加数据，在循环中使用poll获取队列头部的数据，同时将其移出队列，如果当前队列为空则返回null。在main函数中用SimpleSender实例化Sender：`Sender sender = new SimpleSender();`。实际运行，仅输出了一条数据后就卡住了：
```
0: 1
```
原因很明显：从不同的线程中调用了队列的add方法和poll方法，这两个方法都会修改队列，这样就会引起冲突。因此，需要给队列操作加锁，来看改进后Sender线程的实现：
```
    public static class SynchronizedSender extends Sender {

        Queue<Integer> queue = new LinkedList<Integer>();

        @Override
        public void append(int data) {
            synchronized (queue) {//给队列加锁
                queue.add(data);
            }
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                Integer value = null;
                synchronized (queue) {//给队列加锁
                    value = queue.poll();
                }
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
```
如此一来，添加数据和取数据就不会互相影响了，运行效果如预期：
```
0: 1
1: 802
2: 301
```
但是目前仍有一个问题，就是当队列为空时，线程的while循环会不停地运行，消耗资源，影响整体性能。因此接下来继续改进，用线程的suspend方法，在队列为空时将线程阻塞，有数据以后再用resume方法令其恢复运行：
```
    public static class SynchronizedSuspendSender extends Sender {

        Queue<Integer> queue = new LinkedList<Integer>();

        @Override
        public void append(int data) {
            synchronized (queue) {
                queue.add(data);
            }
            resume();//向队列添加数据后恢复线程运行
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                System.out.println("loop running");
                Integer value = null;
                synchronized (queue) {
                    value = queue.poll();
                }
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
                else
                    suspend();//队列为空时阻塞线程
            }
        }
    }
```
运行时打印的内容如下，可以看出循环只运行了五次，其中两次并无数据发送，线程阻塞：
```
loop running
0: 1
loop running
loop running
1: 802
loop running
2: 304
loop running
```
虽然达到了目的，但[suspend方法](https://docs.oracle.com/javase/7/docs/api/java/lang/Thread.html#suspend)和resume方法因为可能引起死锁，已经被标记为废弃（参考：[Java Thread Primitive Deprecation](https://docs.oracle.com/javase/7/docs/technotes/guides/concurrency/threadPrimitiveDeprecation.html)）。我们可以通过对象的wait/notify方法实现同样的效果：
```
    public static class SynchronizedWaitSender extends Sender {

        Queue<Integer> queue = new LinkedList<Integer>();

        @Override
        public void append(int data) {
            synchronized (queue) {
                queue.add(data);
                queue.notify();//通知因queue而阻塞的线程继续运行
            }
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                Integer value = null;
                synchronized (queue) {
                    value = queue.poll();
                    if(value == null)
                        try {
                            queue.wait();//阻塞当前线程并释放queue的锁
                        }
                        catch(InterruptedException e) {
                            e.printStackTrace();
                        }
                }
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
```
wait/nofity方法隶属Ojbect类，适用于任何对象，并且必须在synchronized代码块中使用————wait方法在阻塞线程的同时会释放对象的锁，而对象只有在synchronized代码块中才有锁，参考：[java中线程的阻塞、暂停、启用](http://qs0369.blog.163.com/blog/static/43272385201221241034952/)。  
运行效果一致与使用suspend/resume一致：
```
loop running
0: 1
loop running
loop running
1: 804
loop running
2: 301
loop running
```
其实以上的同步和阻塞我们不需要自己写，可以通过Java内置的[BlockingQueue](https://docs.oracle.com/javase/7/docs/api/java/util/concurrent/BlockingQueue.html)来实现。BlockingQueue是Queue接口的子接口，相对于Queue添加了一个[take方法](https://docs.oracle.com/javase/7/docs/api/java/util/concurrent/BlockingQueue.html#take)，与poll方法功能一样，但在队列为空时它不返回null，而是会阻塞当前调用，直到队列中有值或被interrupt调用打断，被打断后会抛出一个Interrupted Exception。使用BlockingQueue可以另代码简化：
```
    public static class BlockingSender extends Sender {

        BlockingQueue<Integer> queue = new LinkedBlockingQueue<>();//此处将queue替换成了可阻塞的

        @Override
        public void append(int data) {
            queue.add(data);//BlockingQueue是线程安全的，无需手动加锁
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                System.out.println("loop running");
                Integer value = null;
                try {
                    value = queue.take();//当队列为空时阻塞
                }
                catch(InterruptedException e) {
                    e.printStackTrace();
                }
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
```
运行一下，发现只循环了4次：
```
loop running
0: 5
loop running
1: 800
loop running
2: 302
loop running
```
实际上最后一次循环还没有运行完，收到下一个数据后会继续处理。并且无需担心加锁问题，BlockingQueue是线程安全的。  
BlockingQueue可以说完美地解决了我们的问题。不过最后还有一个需求，就是在主线程已经确定没有数据需要发送以后停止数据发送线程。如果我们没有加阻塞机制，那么可以通过控制while()语句判断的变量来结束循环，令线程退出；有阻塞的情况下也很简单，只要调用线程的interrupt方法打断阻塞，并在异常处理中结束循环即可：
```
    public static class BlockingInterruptSender extends Sender {

        BlockingQueue<Integer> queue = new LinkedBlockingQueue<>();

        @Override
        public void append(int data) {
            queue.add(data);
        }

        @Override
        public void run() {
            super.run();
            while(true) {
                Integer value = null;
                try {
                    value = queue.take();
                }
                catch(InterruptedException e) {
                    break;//中断阻塞后结束循环
                }
                System.out.println("keep going");
                if(value != null) {
                    send(value);
                    try {
                        Thread.sleep(300);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    public static void main(String[] args) {
        
        //创建线程和发送数据（略）
        
        //延时停止线程
        try {
            Thread.sleep(1000);
        }
        catch (InterruptedException e) {
            e.printStackTrace();
        }
        sender.interrupt();
    }
```
运行效果如下：
```
keep going
0: 3
keep going
1: 804
keep going
2: 300

Process finished with exit code 0
```
可以看到进程正常退出，而之前的每一次，由于发送线程死循环或阻塞，只能手动中止测试程序。