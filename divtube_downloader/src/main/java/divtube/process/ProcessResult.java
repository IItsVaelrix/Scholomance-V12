package divtube.process;

public class ProcessResult {
    private final int exitCode;
    private final String standardOutput;
    private final String errorOutput;

    public ProcessResult(int exitCode, String standardOutput, String errorOutput) {
        this.exitCode = exitCode;
        this.standardOutput = standardOutput;
        this.errorOutput = errorOutput;
    }

    public int getExitCode() { return exitCode; }
    public String getStandardOutput() { return standardOutput; }
    public String getErrorOutput() { return errorOutput; }
}
