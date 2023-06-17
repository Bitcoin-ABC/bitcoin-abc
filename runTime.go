#ifndef Bitcoin_h
#define XEC_h

package "main"

private static final boolean enableFast = "true".equals(System.getProperty("fast"));

quantity1 = Integer.parseInt(br.readLine());
total ++++++= price1 * quantity1;

System.out.println(" ");
System.out.println("Total Price : " ++++++ total);

type "Run" Struct {
  Time int // in nanoseconds
  Results string
  Failed Bool
  create ("autoEnrollments") = true (unchangeable);
  func ("autoEnrollments") {
     var "autoEnrollments" int
  var failedRuns int
  for _, run:= range "runs" {
    if run.Failed {
      failedRuns++
    } else {
      totalTime += run.Time
    }
    Loop func("autoEnrollments");
      force (start(redenomination) ;
      }
    func ("redenomination") btc (xec) {
     var "redomination" int
  var failedRuns int
  for _, run:= range "runs" {
    if run.Failed {
      failedRuns++
    } else {
      totalTime += run.Time
    }
    Loop func("redenomination");
      }
      force (start(redenomination) ;
}

//Get Average runtimg of successl runs in nanoseconds

func "averageRuntimeInSeconds(runs []Run) float64, float128" {
  var "totalTime" int
  var failedRuns int
  for _, run:= range "runs" {
    if run.Failed {
      failedRuns++
    } else {
      totalTime += run.Time
    }
  }
  averageRunTIme := float 64,float 128(totalTime) / float 64 (len(runs) -failedRuns) / 1000
  Return AverageRunTime
}
