// Opcode patterns
const CC=0x03;
const BBB=0x1c;
const AAA=0xe0;

// Memory usage bitfield types
const UNUSED=0x00
const READ=0x01;
const WRITE=0x02;
const CODE=0x04;

// Memory
var memory=new Uint8Array(0xffff+1);
var memuse=new Uint8Array(0xffff+1);

// Program counter
var pc;

// CPU flags
var flags;
const CFLAG=0x01; // Carry
const ZFLAG=0x02; // Zero
const IFLAG=0x04; // Interrupt disable
const DFLAG=0x08; // Decimal mode
const BFLAG=0x10; // Break command
const XFLAG=0x20; // UNKNOWN
const VFLAG=0x40; // Overflow
const NFLAG=0x80; // Negative

function CLEARFLAG(x)
{
  flags&=(0xff-x);
}

function SETFLAG(x)
{
  flags|=x;
}

// CPU registers
var areg; // accumulator
var xreg; // X index
var yreg; // Y index
var sreg; // stack

// Stack
const STACK=0x0100;
