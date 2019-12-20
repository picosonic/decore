// Opcode patterns
const CC=0x03;
const BBB=0x1c;
const AAA=0xe0;

// Memory usage bitfield types
const UNUSED=0x00
const READ=0x01;
const WRITE=0x02;
const CODE=0x04;

// CPU flags
const CFLAG=0x01; // Carry
const ZFLAG=0x02; // Zero
const IFLAG=0x04; // Interrupt disable
const DFLAG=0x08; // Decimal mode
const BFLAG=0x10; // Break command
const XFLAG=0x20; // UNKNOWN
const VFLAG=0x40; // Overflow
const NFLAG=0x80; // Negative

// Stack
const STACK=0x0100;

var core={
  // Is the core running?
  running:false,

  // Memory
  memory:new Uint8Array(0xffff+1),
  memuse:new Uint8Array(0xffff+1),

  // Program counter
  pc:0,

  // CPU flags
  flags:0,

  // CPU registers
  areg:0, // accumulator
  xreg:0, // X index
  yreg:0, // Y index
  sreg:0, // stack

  ci:0,
  addr:0,
  aaa:0, // opcode
  bbb:0, // addressing mode
  cc:0, // opcode table

  CLEARFLAG:function(x)
  {
    this.flags&=(~x);
  },

  SETFLAG:function(x)
  {
   this.flags|=x;
  },

  // Push a byte onto the stack
  push:function(topush)
  {
    if (this.sreg==0x01)
    {
      console.log("STACK OVERFLOW");
      this.running=false;
    }

    this.memory[STACK+this.sreg]=topush;
    this.sreg--;
  },

  // Pop a byte from the stack
  pop:function()
  {
    if (this.sreg==0xff)
    {
      console.log("STACK UNDERFLOW");
      this.running=false;
    }

    this.sreg++;
    return (this.memory[STACK+this.sreg]);
  },

  // Push a word onto the stack
  pushword:function(topush)
  {
    this.push((topush>>8)&0xff);
    this.push(topush&0xff);
  },

  // Pop a word from the stack
  popword:function()
  {
    var retval;

    retval=this.pop();
    retval|=(this.pop()<<8);

    return retval;
  },

  // Update Z N flags
  update_flagsZN:function(value)
  {
    if (value==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
    if ((value&0x80)!=0) this.SETFLAG(NFLAG); else this.CLEARFLAG(NFLAG);
  },

  // Update Z V N flags
  update_flagsZVN:function(value)
  {
    if (value==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
    if ((value&0x40)!=0) this.SETFLAG(VFLAG); else this.CLEARFLAG(VFLAG);
    if ((value&0x80)!=0) this.SETFLAG(NFLAG); else this.CLEARFLAG(NFLAG);
  },

  // Convert from BCD
  bcd:function(value)
  {
    var retval;

    if ((value&0xf0)<0xA0) retval=((value&0xf0)>>4)*10;
    if ((value&0x0f)<0x0A) retval+=(value&0x0f);

    return retval;
  },

  OSJump:function(addr)
  {
    // TODO
  },

  // Fully reset the core state
  resetcore:function()
  {
    this.pc=0;
    this.areg=0;
    this.xreg=0;
    this.yreg=0;
    this.sreg=0xff;
    this.flags=IFLAG;

    // Clear memory
    for (var i=0; i<this.memory.length; i++)
      this.memory[i]=0;

    for (var i=0; i<this.memuse.length; i++)
      this.memuse[i]=UNUSED;
  },

  // Step a single instruction
  stepcore:function()
  {
    // Mark this memory location as having code
    this.memuse[this.pc]|=CODE;

    // Fetch current instruction
    this.ci=this.memory[this.pc];

    // Move program counter on
    this.pc=(this.pc+1)&0xffff;

    // Decode current instruction
    this.aaa=(this.ci&AAA)>>5;
    this.bbb=(this.ci&BBB)>>2;
    this.cc=(this.ci&CC);

    // Execute instruction
    if ((this.ci&0x0f)==0x08) // Single byte instructions
    {
      switch (this.ci)
      {
        case 0x08:
          console.log("PHP"); // * Push flags onto stack
          this.push(this.flags|0x30); // (0x30 from beebem)
          break;

        case 0x18: // * Clear CARRY flag
          console.log("CLC");
          CLEARFLAG(CFLAG);
          break;

        case 0x28: // * Pull from stack to flags
          console.log("PLP");
          this.flags=this.pop();
          break;

        case 0x38: // * Set CARRY flag
          console.log("SEC");
          SETFLAG(CFLAG);
          break;

        case 0x48: // * Push A onto stack
          console.log("PHA");
          this.push(this.areg);
          break;

        case 0x58: // * Clear INTERRUPT (disable) flag (enable interrupts)
          console.log("CLI");
          CLEARFLAG(IFLAG);
          break;

        case 0x68: // * Pull from stack to A
          console.log("PLA");
          this.areg=this.pop();
          this.update_flagsZN(this.areg);
          break;

        case 0x78: // * Set INTERRUPT (disable) flag (disable interrupts)
          console.log("SEI");
          SETFLAG(IFLAG);
          break;

        case 0x88: // * Decrement Y by 1
          console.log("DEY");
          this.yreg--;
          this.update_flagsZN(this.yreg);
          break;

        case 0x98: // * Transfer Y to A
          console.log("TYA");
          this.areg=this.yreg;
          this.update_flagsZN(this.areg);
          break;

        case 0xa8: // * Transfer A to Y
          console.log("TAY");
          this.yreg=this.areg;
          this.update_flagsZN(this.yreg);
          break;

        case 0xb8: // * Clear OVERFLOW flag
          console.log("CLV");
          CLEARFLAG(VFLAG);
          break;

        case 0xc8: // * Increment Y by 1
          console.log("INY");
          this.yreg++;
          this.update_flagsZN(this.yreg);
          break;

        case 0xd8: // * Clear DECIMAL flag
          console.log("CLD");
          CLEARFLAG(DFLAG);
          break;

        case 0xe8: // * Increment X by 1
          console.log("INX");
          this.xreg++;
          update_flagsZN(this.xreg);
          break;

        case 0xf8: // * Set BCD flag
          console.log("SED");
          SETFLAG(DFLAG);
          this.running=false;
          return; // TODO
          break;

        default:
          console.log("Unknown opcode 0x"+ci.toString(16));
          return;
          break;
      }
    }
    else
    if ((this.ci>=0x80) && ((this.ci&0x0f)==0x0a)) // Other single byte instructions
    {
      switch (this.ci)
      {
        case 0x8a: // * Transfer X to A
          console.log("TXA");
          this.areg=this.xreg;
          this.update_flagsZN(this.areg);
          break;

        case 0x9a: // * Transfer X to stackpointer
          console.log("TXS");
          this.sreg=this.xreg;
          break;

        case 0xaa: // * Transfer A to X
          console.log("TAX");
          this.xreg=this.areg;
          this.update_flagsZN(this.xreg);
          break;

        case 0xba: // * Transfer stackpointer to X
          console.log("TSX");
          this.xreg=this.sreg;
          this.update_flagsZN(this.xreg);
          break;

        case 0xca: // * Decrement X by 1
          console.log("DEX");
          this.xreg--;
          this.update_flagsZN(this.xreg);
          break;

        case 0xea: // * No operation
          console.log("NOP");
          break;

        default:
          console.log("Unknown opcode 0x"+ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
    else
    if ((this.ci&0x1f)==0x10) // Branch instructions
    {
      this.addr=this.memory[this.pc++];
      console.log("if ");
      switch ((this.ci&0xc0)>>6)
      {
        case 0x00: // * Branch on NEGATIVE (BMI/BPL)
          console.log("NEG");
          if ((this.flags & NFLAG)==((this.ci&0x20)<<2)) this.pc+=this.addr;
          break;

        case 0x01: // * Branch on OVERFLOW (BVC/BVS)
          console.log("OVR");
          if ((this.flags & VFLAG)==((this.ci&0x20)<<1)) this.pc+=this.addr;
          break;

        case 0x02: // * Branch on CARRY (BCC/BCS)
          console.log("CRY");
          if ((this.flags & CFLAG)==((this.ci&0x20)>>5)) this.pc+=this.addr;
          break;

        case 0x03: // * Branch on ZERO (BEQ/BNE)
          console.log("ZER");
          if ((fthis.lags & ZFLAG)==((this.ci&0x20)>>4)) this.pc+=this.addr;
          break;

        default:
          console.log("Unknown branch 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
      console.log("="+((this.ci&0x20)>>5)+" then branch "+this.addr);
    }
    else
    if (this.ci==0x00) // * Simulate interrupt request IRQ
    {
      console.log("BRK");
      this.pc++;
      this.pushword(this.pc-1);
      this.push(this.flags|BFLAG);
      this.pc=this.memory[0xffee]|(this.memory[0xffff]<<8);
      return;
    }
    else
    if (this.ci==0x20) // * Jump to subroutine
    {
      this.addr=this.memory[this.pc++];
      this.addr=(this.memory[this.pc++]<<8)+this.addr;

      console.log("JSR abs 0x"+this.addr.toString(16));
      if (this.addr>=0x8000)
      {
        console.log(" ");
        this.OSJump(this.addr);
      }
      else
      {
        this.pushword(this.pc-1);
        this.pc=this.addr;
      }
    }
    else
    if (this.ci==0x40) // * Return from interrupt
    {
      console.log("RTI");
      this.flags=this.pop();
      this.pc=this.popword();
    }
    else
    if (this.ci==0x60) // * Return from subroutine
    {
      console.log("RTS");
      this.pc=this.popword()+1;
    }
    else
    {
      // Process opcode table
      switch (this.cc)
      {

      }
    }
  },

};

function rafcallback(timestamp)
{
  core.stepcore();

  if (core.running)
    window.requestAnimationFrame(rafcallback);
}

function launchcore()
{
  core.resetcore();
  core.running=true;
  window.requestAnimationFrame(rafcallback);
}

launchcore();
